import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { MenuItem } from '../data/menu';
import { calculateDistance } from '../lib/utils';

export default function Checkout() {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { cart: {item: MenuItem, quantity: number}[]; totalAmount: number };
  
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [address, setAddress] = useState<string>('');
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [locError, setLocError] = useState<string>('');
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [outOfZone, setOutOfZone] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // New logic for coupons
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  
  const [storeSettings, setStoreSettings] = useState({ lat: 23.8103, lng: 90.4125, maxDeliveryDistance: 5 });

  useEffect(() => {
    if (!state?.cart?.length || !user) {
      navigate('/');
    }
  }, [state, user, navigate]);

  useEffect(() => {
    import('firebase/firestore').then(({ getDoc, doc }) => {
      getDoc(doc(db, 'settings', 'delivery')).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStoreSettings({
            lat: data.lat || 23.8103,
            lng: data.lng || 90.4125,
            maxDeliveryDistance: data.maxDeliveryDistance || 5
          });
        }
      }).catch(console.error);
    });
  }, []);

  const getLocation = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        
        const dist = calculateDistance(storeSettings.lat, storeSettings.lng, latitude, longitude);
        setDistance(dist);
        
        if (dist > storeSettings.maxDeliveryDistance) {
          setOutOfZone(true);
          setDeliveryFee(0);
        } else {
          setOutOfZone(false);
          let fee = 50; 
          if (dist > 1.2) {
             const extra = dist - 1.2;
             fee += Math.ceil(extra / 0.5) * 10;
          }
          setDeliveryFee(fee);
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        } catch (err) {
          console.error('Geocoding failed', err);
        }
      },
      (err) => setLocError(err.message)
    );
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.trim()), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCouponError('Invalid or expired coupon');
        setDiscount(null);
      } else {
        const couponData = snap.docs[0].data();
        setDiscount({ code: couponData.code, percent: couponData.discountPercentage });
      }
    } catch (err) {
      console.error(err);
      setCouponError('Failed to apply coupon');
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || !coords || !state.cart.length || outOfZone) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter your full name and phone number.');
      return;
    }
    setLoading(true);

    const discountAmount = discount ? (state.totalAmount * discount.percent) / 100 : 0;
    const finalAmount = state.totalAmount - discountAmount + deliveryFee;

    try {
      const orderRef = doc(db, 'orders', crypto.randomUUID());
      await setDoc(orderRef, {
        customerId: user.uid,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: user.email || '',
        status: 'Pending Confirmation',
        totalAmount: finalAmount,
        originalAmount: state.totalAmount,
        discountApplied: discountAmount,
        deliveryFee: deliveryFee,
        couponCode: discount ? discount.code : null,
        location: { ...coords, address },
        items: state.cart.map(c => ({
          id: c.item.id,
          name: c.item.name,
          price: c.item.price,
          quantity: c.quantity
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      (window as any).fbq?.('track', 'Purchase', {
        currency: 'BDT',
        value: finalAmount,
        content_ids: state.cart.map(c => c.item.id)
      });
      
      clearCart();
      navigate('/orders');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
      setLoading(false);
    }
  };

  if (!state) return null;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 mb-8 hover:text-slate-900 transition-colors text-sm font-medium">
        <ArrowLeft size={18} /> Back to menu
      </button>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">Checkout</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 border-b border-slate-100 pb-4 text-slate-900">Order Summary</h2>
        <div className="space-y-4 mb-4">
          {state.cart.map(c => (
            <div key={c.item.id} className="flex justify-between text-sm">
              <div>
                <span className="font-medium text-slate-700">{c.item.name}</span>
                <span className="text-slate-400 ml-2">x{c.quantity}</span>
              </div>
              <span className="font-medium text-slate-900">৳{(c.item.price * c.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Have a coupon code?</label>
          <input 
            type="text" 
            value={couponCode} 
            onChange={e => setCouponCode(e.target.value)} 
            placeholder="Enter code" 
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
          />
        </div>
        <button 
          onClick={handleApplyCoupon}
          className="px-4 py-2 bg-slate-900 text-white rounded font-medium text-sm hover:bg-slate-800"
        >
          Apply
        </button>
      </div>
      {couponError && <p className="text-rose-500 text-sm mb-6 -mt-4">{couponError}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
          <MapPin className="text-slate-700" size={20} /> Delivery Details
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-rose-500">*</span></label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" placeholder="+1 (555) 000-0000" />
          </div>
          <div className="sm:col-span-2">
             <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address</label>
             <textarea 
               value={address} 
               onChange={e => setAddress(e.target.value)} 
               className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500 min-h-[80px]" 
               placeholder="Street address, apartment, city..."
             ></textarea>
          </div>
        </div>

        {!coords ? (
          <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-slate-500 mb-4 text-sm">We need your location to deliver your food.</p>
            <button 
              onClick={getLocation} 
              className="px-6 py-2 bg-slate-200 text-slate-800 text-sm font-bold rounded hover:bg-slate-300 transition-colors"
            >
              Share Location
            </button>
            {locError && <p className="text-rose-500 text-xs mt-3">{locError}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3 text-emerald-800">
              <MapPin className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-bold text-sm">Location acquired!</p>
                {address ? (
                  <p className="text-sm opacity-90 mt-1">{address}</p>
                ) : null}
                <p className="text-xs opacity-70 mt-1 font-mono">Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}</p>
                {distance !== null && <p className="text-xs opacity-80 mt-1 font-semibold">Distance from store: {distance.toFixed(1)} km {outOfZone ? '(Out of zone)' : ''}</p>}
              </div>
            </div>
            <div className="h-48 w-full bg-slate-200 rounded-xl overflow-hidden relative border border-slate-200">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng-0.005},${coords.lat-0.005},${coords.lng+0.005},${coords.lat+0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
              ></iframe>
            </div>
          </div>
        )}
      </div>

      {outOfZone && (
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-6 flex items-start gap-3 text-rose-800">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-bold text-sm">Out of Delivery Zone</p>
            <p className="text-sm opacity-90 mt-1">Sorry, we currently only deliver within {storeSettings.maxDeliveryDistance}km of our store.</p>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex justify-between font-bold text-lg text-slate-900">
          <span>Subtotal</span>
          <span>৳{state.totalAmount.toFixed(2)}</span>
        </div>
        {discount && (
           <div className="flex justify-between font-bold text-emerald-600 mt-2">
             <span>Discount ({discount.percent}%)</span>
             <span>-৳{((state.totalAmount * discount.percent) / 100).toFixed(2)}</span>
           </div>
        )}
        {distance !== null && !outOfZone ? (
           <div className="flex justify-between font-bold text-slate-700 mt-2">
             <span>Delivery Fee {distance <= 1.2 ? '(Min)' : `(${(distance).toFixed(1)} km)`}</span>
             <span>৳{deliveryFee.toFixed(2)}</span>
           </div>
        ) : (
           <div className="flex justify-between font-bold text-slate-500 mt-2 text-sm italic">
             <span>Delivery Fee</span>
             <span>Calculated after location</span>
           </div>
        )}
        <div className="flex justify-between font-bold text-2xl pt-4 border-t border-slate-200 text-slate-900 mt-4">
          <span>Total</span>
          <span>৳{(state.totalAmount - (discount ? (state.totalAmount * discount.percent) / 100 : 0)).toFixed(2)} {deliveryFee > 0 ? `+ ৳${deliveryFee}` : ''}</span>
        </div>
      </div>

      <button 
        disabled={!coords || distance === null || loading || outOfZone}
        onClick={handlePlaceOrder}
        className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-lg shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={20} className="animate-spin" />}
        Place Order
      </button>
    </div>
  );
}

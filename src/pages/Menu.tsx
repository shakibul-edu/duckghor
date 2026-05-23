import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_MENU, MenuItem } from '../data/menu';
import { ShoppingBag, Plus, Minus, Loader2, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, getDocs, setDoc, doc } from 'firebase/firestore';

export default function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart, removeFromCart, totalItems, totalAmount } = useCart();
  const navigate = useNavigate();
  const { user, signInWithGoogle, isAdmin } = useAuth();
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemReviews, setItemReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    let unsubscribeReviews: any;
    if (selectedItem) {
      setLoadingReviews(true);
      const { query, where, onSnapshot } = require('firebase/firestore');
      const q = query(collection(db, 'reviews'), where('itemId', '==', selectedItem.id));
      unsubscribeReviews = onSnapshot(q, (snapshot: any) => {
        const docs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        // sort locally by createdAt desc
        docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setItemReviews(docs);
        setLoadingReviews(false);
      });
    } else {
      setItemReviews([]);
    }
    return () => {
      if (unsubscribeReviews) unsubscribeReviews();
    };
  }, [selectedItem]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menuItems'), snapshot => {
      if (snapshot.empty && isAdmin) {
        // Seed database
        MOCK_MENU.forEach(item => {
          setDoc(doc(db, 'menuItems', item.id), item).catch(console.error);
        });
      } else {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        setMenuItems(items);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [isAdmin]);

  const handleCheckout = () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    navigate('/checkout', { state: { cart, totalAmount } });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 relative">
      <div className="flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Our Menu</h1>
          <p className="text-slate-500 text-lg">Delicious meals delivered hot and fresh to your door.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
          ) : menuItems.map(item => {
            const cartItem = cart.find(c => c.item.id === item.id);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div onClick={() => setSelectedItem(item)} className="cursor-pointer">
                  <div className="h-48 overflow-hidden relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    {((item as any).reviewCount > 0) && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-900 flex items-center gap-1 shadow-sm">
                        <Star size={12} className="text-amber-500 fill-amber-500" /> {((item as any).rating || 5).toFixed(1)}
                        <span className="text-slate-400 font-medium ml-0.5">({(item as any).reviewCount})</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 pb-0 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-slate-900 hover:text-amber-500 transition-colors">{item.name}</h3>
                      <span className="font-bold text-amber-500">৳{item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 flex-1">{item.description}</p>
                  </div>
                </div>
                <div className="p-5 pt-0 mt-auto">
                  {cartItem ? (
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg p-1 border border-slate-200">
                      <button onClick={() => removeFromCart(item.id)} className="p-2 rounded bg-white text-slate-700 shadow-sm hover:bg-slate-100">
                        <Minus size={16} />
                      </button>
                      <span className="font-semibold w-8 text-center text-slate-900">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(item)} className="p-2 rounded bg-slate-900 text-white shadow-sm hover:bg-slate-800">
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)} 
                      className="w-full py-2.5 rounded-lg border border-slate-200 font-medium hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-slate-700"
                    >
                      <Plus size={18} /> Add to Cart
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="lg:w-96 w-full lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
              <ShoppingBag className="text-slate-700" /> Your Cart
            </h2>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {cart.map((c) => (
                <div key={c.item.id} className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-slate-900">{c.item.name}</span>
                    <div className="text-sm text-slate-500">Qty: {c.quantity} &times; ৳{c.item.price.toFixed(2)}</div>
                  </div>
                  <span className="font-medium text-slate-900">৳{(c.item.price * c.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-100 pt-4 mb-6">
              <div className="flex justify-between items-center font-bold text-lg text-slate-900">
                <span>Total</span>
                <span>৳{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold shadow-sm hover:bg-slate-800 transition-colors"
            >
              Checkout ({totalItems} items)
            </button>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Image side */}
            <div className="md:w-1/2 md:h-full relative hidden md:block shrink-0 bg-slate-100">
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover absolute inset-0" />
            </div>
            
            {/* Content side */}
            <div className="md:w-1/2 flex flex-col h-full max-h-[85vh]">
              <div className="p-6 border-b border-slate-100 shrink-0 relative">
                <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div className="flex justify-between items-start mb-2 pr-8">
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight">{selectedItem.name}</h2>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-black text-amber-500 bg-amber-50 px-2 py-1 rounded">৳{selectedItem.price.toFixed(2)}</span>
                  {((selectedItem as any).reviewCount > 0) && (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <Star size={14} className="text-amber-500 fill-amber-500" /> 
                      {((selectedItem as any).rating || 5).toFixed(1)} 
                      <span className="text-slate-400 font-medium ml-1">({(selectedItem as any).reviewCount} reviews)</span>
                    </div>
                  )}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{selectedItem.description}</p>
              </div>

              {/* Reviews List */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">Customer Reviews</h3>
                {loadingReviews ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
                ) : itemReviews.length > 0 ? (
                  <div className="space-y-4">
                    {itemReviews.map(r => (
                      <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-sm text-slate-900">{r.userName}</div>
                          <div className="text-xs text-slate-400 font-medium">{r.createdAt?.toDate().toLocaleDateString() || 'Recently'}</div>
                        </div>
                        <div className="flex gap-1 mb-2">
                          {[1,2,3,4,5].map(star => (
                             <Star key={star} size={10} className={star <= r.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"} />
                          ))}
                        </div>
                        {r.comment && <p className="text-sm text-slate-600 italic">"{r.comment}"</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 focus-visible:outline-none">
                    <Star size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm text-slate-500">No reviews yet.</p>
                  </div>
                )}
              </div>
              
              <div className="p-5 border-t border-slate-100 bg-white shrink-0">
                <button 
                  onClick={() => {
                    addToCart(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="w-full py-3 bg-amber-500 text-slate-900 hover:bg-amber-400 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add to Cart — ৳{selectedItem.price.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

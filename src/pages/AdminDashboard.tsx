import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType, bootstrapAdmin } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, TrendingUp, DollarSign, Package, MapPin } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalOrders: 0, revenue: 0, pending: 0, paid: 0, shipped: 0 });
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'coupons' | 'customers' | 'settings'>('orders');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filteredRevenue, setFilteredRevenue] = useState(0);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [viewDetailOrder, setViewDetailOrder] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState({ lat: 23.8103, lng: 90.4125, maxDeliveryDistance: 5 });

  const [savingSettings, setSavingSettings] = useState(false);

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercentage: 10, isActive: true });
  const [newItem, setNewItem] = useState({ name: '', description: '', price: 0, image: '' });

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(docs);
      
      let rev = 0;
      let p = 0; let pa = 0; let sh = 0;
      const custs = new Map();

      docs.forEach(current => {
        rev += (current.totalAmount || 0);
        if (current.status === 'Pending Confirmation') p++;
        if (current.status === 'Paid') pa++;
        if (current.status === 'Shipped') sh++;

        if (current.customerId) {
          const c = custs.get(current.customerId) || { id: current.customerId, name: current.customerName, email: current.customerEmail, phone: current.customerPhone, totalSpent: 0, orderCount: 0, lastOrder: null };
          c.totalSpent += (current.totalAmount || 0);
          c.orderCount++;
          if (!c.lastOrder || (current.createdAt?.toMillis() > c.lastOrder)) c.lastOrder = current.createdAt?.toMillis();
          // Update details if missing
          if (!c.name) c.name = current.customerName;
          if (!c.phone) c.phone = current.customerPhone;
          custs.set(current.customerId, c);
        }
      });

      setStats({ totalOrders: docs.length, revenue: rev, pending: p, paid: pa, shipped: sh });
      setCustomers(Array.from(custs.values()).sort((a,b) => b.totalSpent - a.totalSpent));
      setLoading(false);
      setDbError(null);
    }, (error) => {
      console.error(error);
      if (error.code === 'permission-denied') {
        setDbError('Database access denied. You bypass frontend checks, but Firestore strictly validates admin roles.');
      }
      setLoading(false);
    });

    const unsubMenu = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'delivery'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreSettings({
          lat: data.lat || 23.8103,
          lng: data.lng || 90.4125,
          maxDeliveryDistance: data.maxDeliveryDistance || 5
        });
      }
    });

    return () => {
      unsubOrders();
      unsubMenu();
      unsubCoupons();
      unsubSettings();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!orders.length) {
      setFilteredRevenue(0);
      setFilteredOrders([]);
      return;
    }
    let rev = 0;
    const start = dateRange.start ? new Date(dateRange.start).setHours(0,0,0,0) : null;
    const end = dateRange.end ? new Date(dateRange.end).setHours(23,59,59,999) : null;
    const filtered: any[] = [];

    orders.forEach(o => {
      const orderTime = o.createdAt?.toMillis();
      if (!orderTime) return;
      if (start && orderTime < start) return;
      if (end && orderTime > end) return;
      rev += (o.totalAmount || 0);
      filtered.push(o);
    });
    setFilteredRevenue(rev);
    setFilteredOrders(filtered);
  }, [dateRange, orders]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
       const { setDoc, doc } = await import('firebase/firestore');
       await setDoc(doc(db, 'settings', 'delivery'), storeSettings, { merge: true });
       alert('Settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const addCoupon = async () => {
    if (!newCoupon.code.trim()) return;
    try {
      import('firebase/firestore').then(({ setDoc, doc }) => {
        setDoc(doc(db, 'coupons', newCoupon.code.trim()), newCoupon);
        setNewCoupon({ code: '', discountPercentage: 10, isActive: true });
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCoupon = async (id: string, currentStatus: boolean) => {
    try {
       import('firebase/firestore').then(({ updateDoc, doc }) => {
         updateDoc(doc(db, 'coupons', id), { isActive: !currentStatus });
       });
    } catch (e) {
      console.error(e);
    }
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price) return;
    try {
       import('firebase/firestore').then(({ doc, setDoc }) => {
         const id = 'm' + Date.now();
         setDoc(doc(db, 'menuItems', id), { ...newItem, id, price: Number(newItem.price) });
         setNewItem({ name: '', description: '', price: 0, image: '' });
       });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
       import('firebase/firestore').then(({ doc, deleteDoc }) => {
         deleteDoc(doc(db, 'menuItems', id));
       });
    } catch(e) {
      console.error(e);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'orders');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  if (dbError) {
    return (
      <div className="text-center py-20 bg-rose-50 rounded-xl border border-rose-200 m-4 max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-rose-900 mb-2">Security Intervention</h2>
        <p className="text-rose-700 font-medium px-4">{dbError}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-4">You do not have administrative privileges.</p>
        <button 
          onClick={() => bootstrapAdmin(user?.email || 'admin@example.com')}
          className="text-slate-900 font-medium hover:underline text-sm"
        >
          Developer: Bootstrap Admin Role for Current User
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold tracking-tight mb-8 text-slate-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Orders</p>
              <h3 className="text-3xl font-bold text-slate-900">{stats.totalOrders}</h3>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Package size={20} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Revenue</p>
              <h3 className="text-3xl font-bold text-slate-900">৳{stats.revenue.toFixed(2)}</h3>
            </div>
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><DollarSign size={20} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status Overview</p>
            </div>
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><TrendingUp size={20} /></div>
          </div>
          <div className="flex justify-between text-sm">
             <div className="text-center"><span className="font-bold text-lg text-amber-600">{stats.pending}</span><br/><span className="text-slate-500 text-xs">Pending</span></div>
             <div className="text-center"><span className="font-bold text-lg text-emerald-600">{stats.paid}</span><br/><span className="text-slate-500 text-xs">Paid</span></div>
             <div className="text-center"><span className="font-bold text-lg text-blue-600">{stats.shipped}</span><br/><span className="text-slate-500 text-xs">Shipped</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-8">
         <h4 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2"><TrendingUp size={16}/> Revenue by Date Range</h4>
         <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
               <label className="text-xs font-medium text-slate-600">From:</label>
               <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-slate-500" />
            </div>
            <div className="flex items-center gap-2">
               <label className="text-xs font-medium text-slate-600">To:</label>
               <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-slate-500" />
            </div>
            <div className="ml-auto font-bold text-slate-900 border-l border-slate-200 pl-4 py-1 flex flex-col items-end">
               <div>Filtered Revenue: <span className="text-emerald-600 font-black">৳{filteredRevenue.toFixed(2)}</span></div>
               <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{filteredOrders.length} orders</div>
            </div>
         </div>
         
         {(dateRange.start || dateRange.end) && filteredOrders.length > 0 && (
           <div className="mt-4 border-t border-slate-100 pt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                 <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                   <tr>
                     <th className="px-3 py-2">Date / ID</th>
                     <th className="px-3 py-2">Customer</th>
                     <th className="px-3 py-2">Status</th>
                     <th className="px-3 py-2 text-right">Amount</th>
                     <th className="px-3 py-2 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredOrders.map(o => (
                     <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                       <td className="px-3 py-2">
                          <div>{o.createdAt?.toDate().toLocaleString()}</div>
                          <div className="font-mono text-slate-400">#{o.id.slice(0,8).toUpperCase()}</div>
                       </td>
                       <td className="px-3 py-2 font-medium">{o.customerEmail}</td>
                       <td className="px-3 py-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest">{o.status}</span>
                       </td>
                       <td className="px-3 py-2 text-right font-bold">৳{o.totalAmount?.toFixed(2)}</td>
                       <td className="px-3 py-2 text-center">
                         <button onClick={() => setViewDetailOrder(o)} className="text-amber-600 hover:text-amber-800 font-bold px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 transition-colors">
                           View
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
           </div>
         )}
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('orders')} className={`py-2 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'orders' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Orders</button>
        <button onClick={() => setActiveTab('customers')} className={`py-2 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'customers' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Customers</button>
        <button onClick={() => setActiveTab('menu')} className={`py-2 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'menu' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Menu Items</button>
        <button onClick={() => setActiveTab('coupons')} className={`py-2 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'coupons' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Coupons</button>
        <button onClick={() => setActiveTab('settings')} className={`py-2 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Settings</button>
      </div>

      {activeTab === 'orders' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-slate-900">Recent Incoming Orders</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Map</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {orders.map(order => (
                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-slate-700 mb-0.5">#{order.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-slate-400 text-[10px] uppercase tracking-wide">{order.createdAt?.toDate().toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{order.customerEmail}</div>
                    {order.location?.address && <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[200px]" title={order.location.address}>{order.location.address}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">৳{order.totalAmount?.toFixed(2) || '0.00'}</div>
                    {order.discountApplied > 0 && order.couponCode && (
                       <div className="text-[10px] text-emerald-600 font-bold">-{order.discountApplied.toFixed(2)} ({order.couponCode})</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a href={`https://maps.google.com/?q=${order.location?.lat},${order.location?.lng}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors" title="View Customer Location">
                      <MapPin size={18} />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'Delivered' ? 'bg-slate-100 text-slate-700' : 
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="bg-white border text-xs font-medium border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-slate-400 focus:outline-none text-slate-700"
                    >
                      <option value="Pending Confirmation">Pending Confirmation</option>
                      <option value="Paid">Paid</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'customers' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
           <h4 className="font-bold text-slate-900">Customer List</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
               <tr className="border-b border-slate-100">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Orders</th>
                  <th className="px-6 py-3">Total Spent</th>
                  <th className="px-6 py-3">Last Order</th>
               </tr>
            </thead>
            <tbody className="text-sm">
               {customers.map(c => (
                 <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="font-bold text-slate-900">{c.name || 'Anonymous'}</div>
                       <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{c.phone || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{c.orderCount}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">৳{c.totalSpent.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs uppercase tracking-wide">{c.lastOrder ? new Date(c.lastOrder).toLocaleString() : '-'}</td>
                 </tr>
               ))}
               {customers.length === 0 && (
                 <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">No customers found.</td></tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h4 className="font-bold text-slate-900 mb-6">Manage Menu Items</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <input placeholder="Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            <input placeholder="Description" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            <input type="number" placeholder="Price" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            <input placeholder="Image URL" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            <button onClick={addMenuItem} className="bg-slate-900 text-white rounded px-4 py-2 text-sm font-bold hover:bg-slate-800">Add Item</button>
          </div>
          <div className="space-y-4">
            {menuItems.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                    <div className="text-slate-500 text-xs">৳{item.price.toFixed(2)}</div>
                  </div>
                </div>
                <button onClick={() => deleteMenuItem(item.id)} className="text-rose-500 text-xs font-bold hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h4 className="font-bold text-slate-900 mb-6">Manage Coupons</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <input placeholder="Coupon Code (e.g. SUMMER20)" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            <input type="number" placeholder="Discount %" value={newCoupon.discountPercentage} onChange={e => setNewCoupon({...newCoupon, discountPercentage: Number(e.target.value)})} className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newCoupon.isActive} onChange={e => setNewCoupon({...newCoupon, isActive: e.target.checked})} className="rounded text-slate-900" />
              <label>Active initially</label>
            </div>
            <button onClick={addCoupon} className="bg-slate-900 text-white rounded px-4 py-2 text-sm font-bold hover:bg-slate-800">Add Coupon</button>
          </div>
          <div className="space-y-4">
            {coupons.map(coupon => (
              <div key={coupon.id} className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{coupon.code}</div>
                  <div className="text-emerald-600 font-bold text-xs">{coupon.discountPercentage}% OFF</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${coupon.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => toggleCoupon(coupon.id, coupon.isActive)} className="text-slate-500 text-xs font-bold hover:text-slate-900">Toggle Status</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h4 className="font-bold text-slate-900 mb-6">Delivery & Store Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">Store Latitude</label>
               <input type="number" step="any" value={storeSettings.lat} onChange={e => setStoreSettings({...storeSettings, lat: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">Store Longitude</label>
               <input type="number" step="any" value={storeSettings.lng} onChange={e => setStoreSettings({...storeSettings, lng: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-bold text-slate-700 mb-1">Max Delivery Distance (km)</label>
               <input type="number" step="0.5" value={storeSettings.maxDeliveryDistance} onChange={e => setStoreSettings({...storeSettings, maxDeliveryDistance: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-500" />
               <p className="text-xs text-slate-500 mt-1">Users outside this radius will not be able to order.</p>
            </div>
            <div className="md:col-span-2">
               <button onClick={saveSettings} disabled={savingSettings} className="bg-slate-900 text-white rounded px-6 py-2 text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                 {savingSettings ? 'Saving...' : 'Save Settings'}
               </button>
            </div>
          </div>
        </div>
      )}

      {viewDetailOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 relative flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="font-bold text-xl text-slate-900">Order #{viewDetailOrder.id.slice(0,8).toUpperCase()}</h3>
              <button onClick={() => setViewDetailOrder(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Customer</p>
                    <p className="font-bold text-slate-900">{viewDetailOrder.customerName || 'Anonymous'}</p>
                    <p className="text-sm text-slate-600">{viewDetailOrder.customerEmail}</p>
                    <p className="text-sm text-slate-600">{viewDetailOrder.customerPhone || 'No phone'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</p>
                    <select 
                      value={viewDetailOrder.status}
                      onChange={(e) => {
                        updateStatus(viewDetailOrder.id, e.target.value);
                        setViewDetailOrder({...viewDetailOrder, status: e.target.value});
                      }}
                      className="bg-white border text-sm font-bold border-slate-200 rounded px-3 py-2 w-full mt-1 focus:outline-none"
                    >
                      <option value="Pending Confirmation">Pending Confirmation</option>
                      <option value="Paid">Paid</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
               </div>
               
               <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-3">Order Items</h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    {viewDetailOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 text-sm">
                        <span className="text-slate-700">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-slate-900">৳{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-col gap-1 text-sm text-right">
                       {viewDetailOrder.discountApplied > 0 && (
                          <div className="text-emerald-600">Discount ({viewDetailOrder.couponCode}): -৳{viewDetailOrder.discountApplied.toFixed(2)}</div>
                       )}
                       {viewDetailOrder.deliveryFee > 0 && (
                          <div className="text-slate-600">Delivery Fee: +৳{viewDetailOrder.deliveryFee.toFixed(2)}</div>
                       )}
                       <div className="font-black text-slate-900 text-lg mt-1">Total: ৳{viewDetailOrder.totalAmount?.toFixed(2)}</div>
                    </div>
                  </div>
               </div>

               {viewDetailOrder.location?.lat && viewDetailOrder.location?.lng && (
                 <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-1.5"><MapPin size={16} className="text-slate-500" /> Delivery Location</h4>
                    <div className="h-48 w-full bg-slate-200 rounded-xl overflow-hidden relative border border-slate-200 mb-2">
                       <iframe 
                         width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0} 
                         src={`https://www.openstreetmap.org/export/embed.html?bbox=${viewDetailOrder.location.lng-0.005},${viewDetailOrder.location.lat-0.005},${viewDetailOrder.location.lng+0.005},${viewDetailOrder.location.lat+0.005}&layer=mapnik&marker=${viewDetailOrder.location.lat},${viewDetailOrder.location.lng}`}
                       ></iframe>
                    </div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewDetailOrder.location.address}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

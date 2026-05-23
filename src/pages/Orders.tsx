import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDoc, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Package, MapPin, ChevronDown, ChevronUp, Clock, Star } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const toggleDetails = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const submitReview = async () => {
    if (!reviewOrder || !user) return;
    setSubmittingReview(true);
    try {
      // 1. Mark order as reviewed
      await updateDoc(doc(db, 'orders', reviewOrder.id), { reviewed: true, updatedAt: serverTimestamp() });
      
      // 2. Update all unique items in this order
      const uniqueItemIds = Array.from(new Set(reviewOrder.items?.map((i: any) => i.id) || []));
      for (const itemId of uniqueItemIds) {
        // Add to reviews collection
        await addDoc(collection(db, 'reviews'), {
          orderId: reviewOrder.id,
          itemId: itemId as string,
          userId: user.uid,
          userName: user.displayName || 'Anonymous User',
          rating,
          comment,
          createdAt: serverTimestamp()
        });

        // Update item average rating
        const itemRef = doc(db, 'menuItems', itemId as string);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const itemData = itemSnap.data();
          const oldCount = itemData.reviewCount || 0;
          const oldRating = itemData.rating || 0;
          const newCount = oldCount + 1;
          const newRating = ((oldRating * oldCount) + rating) / newCount;
          await updateDoc(itemRef, {
            rating: newRating,
            reviewCount: newCount
          });
        }
      }
      setReviewOrder(null);
      setRating(5);
      setComment('');
      // Show success
      alert('Review successfully submitted. Thank you!');
    } catch (err: any) {
      console.error(err);
      alert('Error saving review: ' + err.message);
      handleFirestoreError(err, OperationType.UPDATE, 'orders');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // We order by createdAt desc if index exists, but typically simple queries default to doc ID if no inequality.
    // For simplicity without setting up composite indexes, let's just query and sort locally or use only simple where.
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Soft sort locally to avoid index reqs
      docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return <div className="text-center py-20 text-gray-500">Please sign in to view your orders.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight mb-8 text-slate-900">My Orders</h1>
      
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-600" size={32} /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Package className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h2>
          <p className="text-slate-500 text-sm">Looks like you haven't placed any orders.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                    ID: #{order.id.slice(0,8).toUpperCase()} • {order.createdAt?.toDate().toLocaleDateString() || 'Just now'}
                  </div>
                  <div className="font-bold flex items-center gap-2 text-sm text-slate-900 mb-4">
                    Status: 
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'Delivered' ? 'bg-slate-100 text-slate-700' : 
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  {/* Real-time Tracker */}
                  <div className="w-full sm:w-64">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 relative overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700 absolute left-0 top-0" style={{ 
                        width: `${(['Pending Confirmation', 'Paid', 'Shipped', 'Delivered'].indexOf(order.status) / 3) * 100}%` 
                      }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] uppercase font-bold text-slate-400">
                      {['Pending', 'Paid', 'Shipped', 'Delivered'].map((s, i) => (
                        <span key={s} className={i <= ['Pending Confirmation', 'Paid', 'Shipped', 'Delivered'].indexOf(order.status) ? "text-emerald-600" : ""}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right mt-4 md:mt-0">
                  <div className="text-xl font-bold text-slate-900 flex items-center justify-end gap-2">
                    ৳{order.totalAmount?.toFixed(2)}
                  </div>
                  {order.discountApplied > 0 && order.couponCode && (
                     <div className="text-xs text-emerald-600 font-bold mb-1">-৳{order.discountApplied.toFixed(2)} ({order.couponCode})</div>
                  )}
                  {order.deliveryFee > 0 && (
                     <div className="text-xs text-slate-500 font-medium mb-1">+৳{order.deliveryFee.toFixed(2)} delivery</div>
                  )}
                  <div className="text-xs text-slate-400 font-medium tracking-wide uppercase mb-3">{order.items?.length || 0} items</div>
                  {!order.reviewed && ['Paid', 'Shipped', 'Delivered'].includes(order.status) && (
                    <button 
                      onClick={() => setReviewOrder(order)}
                      className="bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-end gap-1 ml-auto"
                    >
                      <Star size={12} className="fill-amber-700" /> Review
                    </button>
                  )}
                  {order.reviewed && (
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-end gap-1">
                      <Star size={10} className="fill-slate-400 text-slate-400" /> Reviewed
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => toggleDetails(order.id)} 
                className="w-full flex items-center justify-center gap-2 py-2 mt-2 border-t border-slate-100 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                {expandedOrders.has(order.id) ? (
                  <><ChevronUp size={16} /> Hide Details</>
                ) : (
                  <><ChevronDown size={16} /> View Details</>
                )}
              </button>

              {expandedOrders.has(order.id) && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900">Order Items</h4>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-slate-700 text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-medium">৳{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900">Updates</h4>
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm text-slate-600">
                      {order.createdAt && (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span>Placed: {order.createdAt.toDate().toLocaleString()}</span>
                        </div>
                      )}
                      {order.updatedAt && (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-500" />
                          <span className="font-medium text-slate-900">Last updated: {order.updatedAt.toDate().toLocaleString()} ({order.status})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><MapPin size={16} className="text-slate-700" /> Delivery Location</h4>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                      {order.location?.lat && order.location?.lng && (
                        <div className="h-40 w-full bg-slate-200 relative">
                          <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no" 
                            marginHeight={0} 
                            marginWidth={0} 
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.location.lng-0.005},${order.location.lat-0.005},${order.location.lng+0.005},${order.location.lat+0.005}&layer=mapnik&marker=${order.location.lat},${order.location.lng}`}
                          ></iframe>
                        </div>
                      )}
                      <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="text-slate-600 text-sm">{order.location?.address}</div>
                          <div className="text-slate-400 font-mono text-xs mt-1">{order.location?.lat?.toFixed(5)}, {order.location?.lng?.toFixed(5)}</div>
                        </div>
                        <a 
                          href={`https://maps.google.com/?q=${order.location?.lat},${order.location?.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white border border-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0"
                        >
                          <MapPin size={14} /> Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Rate Your Order</h2>
              <p className="text-sm text-slate-500 mb-6">How was your food? Your feedback helps us improve.</p>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(star => (
                   <button 
                     key={star} 
                     onClick={() => setRating(star)}
                     className="focus:outline-none transition-transform hover:scale-110"
                   >
                     <Star size={32} className={`${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                   </button>
                ))}
              </div>

              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave a comment (optional)..."
                className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:border-amber-500"
              ></textarea>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-4 flex gap-3 justify-end rounded-b-2xl">
              <button 
                onClick={() => setReviewOrder(null)} 
                disabled={submittingReview}
                className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                disabled={submittingReview}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                {submittingReview && <Loader2 size={16} className="animate-spin" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

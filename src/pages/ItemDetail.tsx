import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useCart } from '../contexts/CartContext';
import { MenuItem } from '../data/menu';
import { Star, ArrowLeft, Plus, Minus, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';

export default function ItemDetail() {
  const { itemName } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCart();
  
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemName) return;
      
      try {
        // Need to match itemName back to the real name. 
        // We'll fetch all and find the match client side since we don't store the slug in DB yet.
        const snapshot = await getDocs(collection(db, 'menuItems'));
        const matchedItem = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)).find(
          m => encodeURIComponent(m.name.toLowerCase().replace(/ /g, '-')) === itemName
        );

        if (matchedItem) {
          setItem(matchedItem);
        } else {
          navigate('/menu');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemName, navigate]);

  useEffect(() => {
    let unsubscribe: any;
    if (item) {
      setLoadingReviews(true);
      const q = query(collection(db, 'reviews'), where('itemId', '==', item.id));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setReviews(docs);
        setLoadingReviews(false);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [item]);

  if (loading) {
    return <div className="flex justify-center items-center py-32"><Loader2 className="animate-spin text-amber-500" size={48} /></div>;
  }

  if (!item) return null;

  const cartItem = cart.find(c => c.item.id === item.id);

  return (
    <div className="max-w-4xl mx-auto w-full pb-16">
      <SEO 
        title={`${item.name} - Duckঘর Delivery`} 
        description={item.description}
        image={item.image}
      />
      
      <button 
        onClick={() => navigate('/menu')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={18} /> Back to Menu
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
        <div className="md:w-1/2 h-64 md:h-auto min-h-[300px] relative bg-slate-100">
          <img src={item.image || undefined} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        
        <div className="md:w-1/2 flex flex-col p-8 md:p-10">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{item.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-2xl font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-lg">৳{item.price.toFixed(2)}</span>
              
              {((item as any).reviewCount > 0) && (
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                  <Star size={16} className="text-amber-500 fill-amber-500" /> 
                  {((item as any).rating || 5).toFixed(1)} 
                  <span className="text-slate-400 font-medium ml-1">({(item as any).reviewCount} reviews)</span>
                </div>
              )}
            </div>

            <p className="text-lg text-slate-600 leading-relaxed mb-8">{item.description}</p>
          </div>

          <div className="pt-6 border-t border-slate-100">
            {cartItem ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2 border border-slate-200">
                <button onClick={() => removeFromCart(item.id)} className="p-3 rounded-lg bg-white text-slate-700 shadow-sm hover:bg-slate-100 transition-colors">
                  <Minus size={20} />
                </button>
                <span className="font-bold text-xl text-slate-900 px-8">{cartItem.quantity}</span>
                <button onClick={() => addToCart(item)} className="p-3 rounded-lg bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => addToCart(item)} 
                className="w-full py-4 rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 font-bold shadow-sm transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <Plus size={22} /> Add to Cart — ৳{item.price.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Customer Reviews</h2>
        {loadingReviews ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map(r => (
              <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-slate-900">{r.userName}</div>
                  <div className="text-sm text-slate-400 font-medium">{r.createdAt?.toDate().toLocaleDateString() || 'Recently'}</div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} size={14} className={star <= r.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"} />
                  ))}
                </div>
                {r.comment && <p className="text-slate-600 italic">"{r.comment}"</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-12 text-center">
            <Star size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Reviews Yet</h3>
            <p className="text-slate-500">Be the first to review this dish after ordering!</p>
          </div>
        )}
      </div>
    </div>
  );
}

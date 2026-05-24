import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuItem } from '../data/menu';
import { ArrowRight, Utensils, Star, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import SEO from '../components/SEO';

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(collection(db, 'menuItems'), limit(3));
        const snap = await getDocs(q);
        setFeatured(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="flex flex-col gap-16 pb-12">
      <SEO 
        title="Duckঘর | Premium Authentic Duck Meat Delivery" 
        description="Experience the rich, authentic, and traditional flavors of premium duck meat dishes in Chattogram. Duckঘর brings Bengal's finest duck recipes straight to your doorstep."
        url={window.location.origin}
      />
      {/* Hero Section */}
      <section className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-xl mt-4">
        <div className="absolute inset-0 opacity-50 mix-blend-overlay" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80")', backgroundPosition: 'center', backgroundSize: 'cover'}}></div>
        <div className="relative z-10 px-6 py-20 sm:px-12 sm:py-28 max-w-3xl flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Utensils size={14} /> Premium Duck Cuisine
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight">
            The Ultimate <span className="text-amber-500">Duck Meat</span> Experience
          </h1>
          <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
            Savor the rich, tender, and authentic taste of traditional duck dishes. Handcrafted with premium spices and time-honored recipes, Duckঘর delivers the finest duck delicacies straight to your table.
          </p>
          <div className="flex gap-4 mt-4">
            <button onClick={() => navigate('/menu')} className="bg-amber-500 text-slate-900 hover:bg-amber-400 font-bold px-8 py-4 rounded-xl shadow-lg transition-all flex items-center gap-2">
              Explore Our Menu <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Signature Duck Dishes</h2>
            <p className="text-slate-500 mt-2">Our most loved specialities, cooked to perfection.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-xl h-72 animate-pulse"></div>
            ))
          ) : featured.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div 
                className="cursor-pointer flex-col flex flex-1"
                onClick={() => navigate(`/menu/${encodeURIComponent(item.name.toLowerCase().replace(/ /g, '-'))}`)}
              >
                <div className="h-48 overflow-hidden relative">
                  <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-900 flex items-center gap-1 shadow-sm">
                    <Star size={12} className="text-amber-500 fill-amber-500" /> {((item as any).rating || 5).toFixed(1)}
                    {((item as any).reviewCount > 0) && <span className="text-slate-400 font-medium ml-0.5">({(item as any).reviewCount})</span>}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-amber-500 transition-colors">{item.name}</h3>
                    <span className="font-black text-amber-500 bg-amber-50 px-2 py-1 rounded text-sm">৳{item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-5 line-clamp-2 flex-1">{item.description}</p>
                </div>
              </div>
              <div className="p-5 pt-0">
                <button 
                  onClick={() => navigate(`/menu/${encodeURIComponent(item.name.toLowerCase().replace(/ /g, '-'))}`)}
                  className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-4">
          <button 
            onClick={() => navigate('/menu')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
          >
            See All Items <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Info Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
         <div className="bg-amber-100 p-8 rounded-2xl flex flex-col items-center text-center justify-center">
            <div className="bg-amber-200 p-4 rounded-full text-amber-700 mb-4 shadow-[0_0_20px_rgba(251,191,36,0.5)]"><Clock size={32} /></div>
            <h3 className="text-xl font-black text-amber-900 mb-2">Fast Delivery</h3>
            <p className="text-amber-800 text-sm max-w-xs">We bring your favorite meals piping hot in 45 minutes or less.</p>
         </div>
         <div className="bg-slate-900 p-8 rounded-2xl flex flex-col items-center text-center justify-center">
            <div className="bg-slate-800 p-4 rounded-full text-slate-300 mb-4"><Utensils size={32} /></div>
            <h3 className="text-xl font-black text-white mb-2">Quality Ingredients</h3>
            <p className="text-slate-400 text-sm max-w-xs">We source only the finest spices and ingredients for that real taste.</p>
         </div>
      </section>
    </div>
  );
}

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, ArrowLeft, Plus, Minus, ShoppingBag } from 'lucide-react';

export default function Cart() {
  const { cart, removeFromCart, addToCart, removeEntireItem, totalAmount, clearCart } = useCart();
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <ShoppingBag size={48} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-6 text-center">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/menu" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold transition-colors">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft size={18} /> Continue Shopping
        </button>
        <button onClick={clearCart} className="text-rose-500 hover:text-rose-700 text-sm font-medium transition-colors">
          Clear Cart
        </button>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">Your Cart</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="divide-y divide-slate-100">
          {cart.map((c) => (
            <div key={c.item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-slate-100">
                <img src={c.item.image || undefined} alt={c.item.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{c.item.name}</h3>
                <p className="text-emerald-600 font-bold mt-1">৳{c.item.price.toFixed(2)}</p>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:gap-4 mt-2 sm:mt-0">
                <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
                  <button 
                    onClick={() => removeFromCart(c.item.id)} 
                    className="p-1.5 rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors shadow-sm"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-slate-900">{c.quantity}</span>
                  <button 
                    onClick={() => addToCart(c.item)} 
                    className="p-1.5 rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="font-black text-slate-900 min-w-[#80px] text-right">
                  ৳{(c.item.price * c.quantity).toFixed(2)}
                </div>

                <button 
                  onClick={() => removeEntireItem(c.item.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-slate-500 font-medium">Subtotal (before delivery)</p>
          <p className="text-3xl font-black text-slate-900 mt-1">৳{totalAmount.toFixed(2)}</p>
        </div>
        <button 
          onClick={handleCheckout}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3.5 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-sm text-lg flex items-center justify-center gap-2"
        >
          Check Out <ArrowLeft size={18} className="rotate-180" />
        </button>
      </div>
    </div>
  );
}

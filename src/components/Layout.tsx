import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { LogOut, LayoutDashboard, ShoppingBag, MapPin, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Layout() {
  const { user, isAdmin, signInWithGoogle, logOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Duckঘর Logo" className="h-10 w-auto" />
              <span className="font-bold text-xl tracking-tight text-slate-900">Duckঘর</span>
            </Link>

            <nav className="hidden md:flex gap-6 items-center">
              <Link to="/menu" className="text-slate-600 hover:text-amber-500 font-medium transition-colors">Menu</Link>
              
              {/* Cart Indicator */}
              <Link to="/menu" className="relative text-slate-600 hover:text-amber-500 transition-colors p-1">
                <ShoppingBag size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>

              {user ? (
                <>
                  <Link to="/orders" className="text-slate-600 hover:text-amber-500 font-medium transition-colors">My Orders</Link>
                  {isAdmin && (
                    <Link to="/admin" className="text-amber-500 hover:text-amber-600 font-medium transition-colors flex items-center gap-1">
                      <LayoutDashboard size={18} />
                      Dashboard
                    </Link>
                  )}
                  <div className="flex items-center gap-4 ml-4 border-l border-slate-200 pl-4">
                    <div className="flex items-center gap-2">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
                      ) : (
                        <div className="bg-slate-100 p-1 rounded-full border border-slate-200"><UserIcon size={20} className="text-slate-400" /></div>
                      )}
                      <span className="text-sm font-bold text-slate-800">{user.displayName || user.email}</span>
                    </div>
                    <button 
                      onClick={() => { logOut(); navigate('/'); }} 
                      className="text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 p-1.5 rounded-md border border-slate-100"
                      title="Log Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={signInWithGoogle}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2 rounded-lg font-bold transition-colors text-sm shadow-sm"
                >
                  Sign in
                </button>
              )}
            </nav>
            {/* Mobile menu could go here */}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="flex-1 flex flex-col"
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Duckঘর Delivery. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

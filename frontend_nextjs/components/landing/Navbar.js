'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-zinc-100 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-black text-zinc-950 tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg italic">C</div>
          CloudentApp
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/#funciones" className="text-sm font-bold text-zinc-500 hover:text-blue-600 transition-colors">Funciones</Link>
          <Link href="/#precios" className="text-sm font-bold text-zinc-500 hover:text-blue-600 transition-colors">Precios</Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="bg-zinc-950 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200">Dashboard</Link>
          ) : (
            <Link href="/login" className="bg-zinc-950 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200">Iniciar Sesión</Link>
          )}
        </div>

        <button 
          type="button"
          aria-label="Menú principal"
          className="md:hidden text-zinc-950 p-2 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-zinc-100 p-6 space-y-4 animate-in fade-in slide-in-from-top-2 shadow-lg">
          <Link 
            href="/#funciones" 
            onClick={() => setIsOpen(false)}
            className="block font-bold text-zinc-600 hover:text-blue-600 transition-colors py-1"
          >
            Funciones
          </Link>
          <Link 
            href="/#precios" 
            onClick={() => setIsOpen(false)}
            className="block font-bold text-zinc-600 hover:text-blue-600 transition-colors py-1"
          >
            Precios
          </Link>
          <Link 
            href={isLoggedIn ? "/dashboard" : "/login"} 
            onClick={() => setIsOpen(false)}
            className="block bg-zinc-950 text-white px-4 py-3 rounded-xl text-center font-bold hover:bg-zinc-800 transition-all shadow-md"
          >
            {isLoggedIn ? 'Dashboard' : 'Iniciar Sesión'}
          </Link>
        </div>
      )}
    </nav>
  );
}
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token && token !== 'test_token_123');
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-purple-600">
          CloudentApp
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8">
          <Link href="/#funciones" className="text-gray-600 hover:text-purple-600">Funciones</Link>
          <Link href="/#precios" className="text-gray-600 hover:text-purple-600">Precios</Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="bg-purple-600 text-white px-4 py-2 rounded-lg">Dashboard</Link>
          ) : (
            <Link href="/login" className="bg-purple-600 text-white px-4 py-2 rounded-lg">Iniciar Sesión</Link>
          )}
        </div>

        {/* Mobile button */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t p-4 space-y-3">
          <Link href="/#funciones" className="block text-gray-600">Funciones</Link>
          <Link href="/#precios" className="block text-gray-600">Precios</Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="block bg-purple-600 text-white px-4 py-2 rounded-lg text-center">Dashboard</Link>
          ) : (
            <Link href="/login" className="block bg-purple-600 text-white px-4 py-2 rounded-lg text-center">Iniciar Sesión</Link>
          )}
        </div>
      )}
    </nav>
  );
}
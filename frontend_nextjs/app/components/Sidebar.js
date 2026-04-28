'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';  // ← Agregar
import Link from 'next/link';
import { Menu, X, Home, Users, CalendarDays, Trash2, CreditCard, UserCog, LogOut } from 'lucide-react';
import { setAuthToken } from '@/config/api';  // ← Agregar

export default function Sidebar() {
  const router = useRouter();  // ← Agregar
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil basado en el ancho de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      // Si es PC, forzar sidebar abierto
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // ← AGREGAR función de logout
  const handleLogout = () => {
    // Eliminar el token del localStorage
    setAuthToken(null);
    // Redirigir al login
    router.push('/login');
  };

  return (
    <>
      {/* Botón Hamburguesa - solo visible en móvil */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      )}

      {/* Overlay - solo en móvil cuando el sidebar está abierto */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50
          transition-transform duration-300 ease-in-out
          w-80
          ${isMobile 
            ? (isOpen ? 'translate-x-0' : '-translate-x-full')
            : 'translate-x-0'
          }
        `}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-black">Historia Clínica</h2>
            <p className="text-sm text-gray-600 mt-1">Usuario Demo</p>
          </div>
          {isMobile && (
            <button
              onClick={closeSidebar}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>

        <nav className="p-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <Home className="w-5 h-5" />
            <span>Inicio</span>
          </Link>
          <Link
            href="/pacientes"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <Users className="w-5 h-5" />
            <span>Pacientes</span>
          </Link>
          <Link
            href={`/calendario/dia?fecha=${new Date().toISOString().split('T')[0]}`}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <CalendarDays className="w-5 h-5" />
            <span>Agendar</span>
          </Link>
          <Link
            href="/pacientes/papelera"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <Trash2 className="w-5 h-5" />
            <span>Papelera</span>
          </Link>
          <Link
            href="/pagos"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <CreditCard className="w-5 h-5" />
            <span>Pagos</span>
          </Link>
        </nav>

        <hr className="my-4 border-gray-200" />

        <nav className="p-4 space-y-2">
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <UserCog className="w-5 h-5" />
            <span>Mi Perfil</span>
          </Link>
          {/* ← MODIFICAR el botón de Salir para que use handleLogout */}
          <button
            onClick={() => {
              closeSidebar();
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Salir</span>
          </button>
        </nav>
      </aside>
    </>
  );
}
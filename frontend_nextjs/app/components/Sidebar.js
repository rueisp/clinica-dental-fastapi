'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, Home, Users, CalendarDays, Trash2, CreditCard, UserCog, LogOut, MessageSquare, Bot } from 'lucide-react';
import { setAuthToken } from '@/config/api';
import { useUser } from '@/context/UserContext';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const { user, loading } = useUser(); 
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const planLabel = (() => {
    if (loading || !user) return { nombre: 'Cargando...', color: 'text-gray-400' };
    if (user.is_admin) return { nombre: 'Administrador', color: 'text-purple-600' };
    
    const planNombre = user.plan_info?.nombre?.toLowerCase() || '';
    
    if (planNombre === 'trial') {
      return { nombre: 'Plan Trial', color: 'text-green-600' };
    }
    if (planNombre.includes('basic') || planNombre.includes('basico')) {
      return { nombre: 'Plan Básico', color: 'text-blue-600' };
    }
    if (planNombre.includes('pro')) {
      return { nombre: 'Plan Pro', color: 'text-purple-600' };
    }
    
    return { nombre: 'Plan Activo', color: 'text-gray-600' };
  })();

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsOpen(!mobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => { if (isMobile) setIsOpen(false); };

  const handleLogout = () => {
    setAuthToken(null);
    window.location.href = '/login'; 
  };

  if (loading) return <div className="fixed inset-y-0 left-0 w-80 bg-white border-r border-gray-200 animate-pulse" />;

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
            <h2 className="text-xl font-black text-black tracking-tighter">CloudentApp</h2>
            <div className="mt-1">
              <p className="text-sm font-bold text-gray-700 capitalize leading-none">
                Dr. {(user?.nombres || 'Doctor').toLowerCase()}
              </p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${planLabel.color}`}>
                {planLabel.nombre}
              </p>
            </div>
          </div>
          {isMobile && (
            <button onClick={closeSidebar} className="p-1 rounded-lg hover:bg-gray-100">
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

          {/* 💬 NUEVO ACCESO: Chat WhatsApp */}
          <Link
            href="/chat"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/chat'
                ? 'bg-blue-50 text-blue-600 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={closeSidebar}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Chat WhatsApp</span>
          </Link>

          <Link
            href="/bot-config"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/bot-config'
                ? 'bg-blue-50 text-blue-600 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={closeSidebar}
          >
            <Bot className="w-5 h-5" />
            <span>Configurar Bot</span>
          </Link>

          <Link
            href="/"
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
            href="/planes"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <CreditCard className="w-5 h-5" />
            <span>Planes</span>
          </Link>
          
          <Link
            href="/perfil"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={closeSidebar}
          >
            <UserCog className="w-5 h-5" />
            <span>Mi Perfil</span>
          </Link>

          {user?.is_admin && (
            <Link
              href="/admin/pagos"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border ${
                pathname === '/admin/pagos' 
                  ? 'text-purple-700 bg-purple-50 border-purple-100' 
                  : 'text-gray-700 hover:bg-gray-100 border-transparent'
              }`}
              onClick={closeSidebar}
            >
              <UserCog className="w-5 h-5" />
              <span className="font-bold text-sm">Validar Pagos</span>
            </Link>
          )}
          
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
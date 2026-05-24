// components/AuthGuard.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext'; 

export default function AuthGuard({ children }) {
  // 1. Extraemos el usuario y el estado de carga del contexto global
  const { user, loading } = useUser(); 
  const router = useRouter();

  useEffect(() => {
    // 2. Si el contexto terminó de cargar y NO encontró un usuario válido,
    // significa que el token no existe o expiró. Redirigimos a login.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 3. Mientras el UserContext hace la petición al backend (/api/usuarios/me),
  // mostramos una pantalla de carga profesional.
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Verificando Sesión...</p>
      </div>
    );
  }

  // 4. Si hay usuario, renderizamos los componentes hijos (Dashboard, Pacientes, etc.)
  return user ? children : null;
}
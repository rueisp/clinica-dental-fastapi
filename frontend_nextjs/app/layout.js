'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import './globals.css';
import { UserProvider } from '@/context/UserContext';

export default function RootLayout({ children }) {
  const pathname = usePathname() || '';
  
  const cleanPathname = pathname.split('?')[0].replace(/\/$/, "") || '/';
  const publicRoutes = ['/', '/login', '/registro', '/privacidad', '/terminos'];
  const isPublicRoute = 
    publicRoutes.includes(cleanPathname) || 
    cleanPathname.startsWith('/pagos/recibo/');

  // Registro del Service Worker para notificaciones nativas
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('[PWA] Service Worker registrado con éxito:', registration.scope);
      }).catch((err) => {
        console.error('[PWA] Error registrando Service Worker:', err);
      });
    }
  }, []);

  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-gray-100 antialiased">
        <UserProvider> 
          <div className="flex flex-col md:flex-row min-h-screen">
            {!isPublicRoute && <Sidebar />}

            <main 
              key={cleanPathname}
              className={`flex-1 w-full ${
                isPublicRoute 
                  ? 'lg:ml-0 p-0' 
                  : 'p-4 lg:p-8 lg:ml-80 pt-16 lg:pt-8'
              }`}
            >
              {children}
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import './globals.css';
import { UserProvider } from '@/context/UserContext';

export default function RootLayout({ children }) {
  const pathname = usePathname();
    const cleanPathname = pathname ? (pathname.split('?')[0].replace(/\/$/, "") || '/') : '';
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-gray-100 antialiased">
        <UserProvider> 
          <div className="flex flex-col md:flex-row min-h-screen">
            {!isPublicRoute && <Sidebar />}

            <main 
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
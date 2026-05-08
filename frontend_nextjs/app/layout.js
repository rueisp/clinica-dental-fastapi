'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import './globals.css';

export default function RootLayout({ children }) {
  const pathname = usePathname() || '';
  
  // Normalización robusta de la ruta
  const cleanPathname = pathname.split('?')[0].replace(/\/$/, "") || '/';
  const publicRoutes = ['/', '/login', '/registro', '/privacidad', '/terminos'];
  const isPublicRoute = publicRoutes.includes(cleanPathname);

  return (
    <html lang="es">
      <body className="bg-gray-100 antialiased">
        <div className="flex flex-col md:flex-row min-h-screen">
          
          {/* Solo renderiza el Sidebar si NO es ruta pública */}
          {!isPublicRoute && <Sidebar />}

          <main 
            key={cleanPathname} // Forzamos refresco de eventos de clic al cambiar de ruta
            className={`flex-1 w-full ${
              isPublicRoute 
                ? 'md:ml-0 p-0' 
                : 'p-4 lg:p-8 md:ml-80 pt-16 md:pt-8'
            }`}
          >
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}
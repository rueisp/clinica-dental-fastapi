'use client';
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

  return (
    <html lang="es">
      <body className="bg-gray-100 antialiased">
        {/* AGREGADO: Envoltura obligatoria para que el contexto funcione */}
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
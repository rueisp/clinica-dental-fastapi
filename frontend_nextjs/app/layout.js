import './globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'Clínica Dental',
  description: 'Sistema de gestión clínica dental',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-100">
        <Sidebar />
        <main className="min-h-screen p-4 lg:p-8 md:ml-80 pt-16 md:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
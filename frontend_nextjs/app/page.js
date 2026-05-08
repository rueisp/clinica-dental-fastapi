'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';


export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // LÓGICA: Si ya hay un token o sesión, mandarlo directo al dashboard
    // Esto evita que un usuario logueado vea la landing otra vez
    const session = localStorage.getItem('auth_token'); // O como guardes tu sesión
    if (session) {
      router.push('/dashboard');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  // Mientras revisa si hay sesión, mostramos una pantalla limpia
  if (isChecking) return null;

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      
      {/* Footer simple */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p>© 2026 CloudentApp - Creado por un dentista para dentistas</p>
          <div className="mt-4 space-x-4">
            <Link href="/privacidad" className="text-gray-400 hover:text-white">Privacidad</Link>
          <Link href="/terminos" className="text-gray-400 hover:text-white">Términos</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
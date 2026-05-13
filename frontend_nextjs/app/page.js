'use client';
import { useEffect, useState, Suspense } from 'react'; // 1. Agregado Suspense
import { useRouter, useSearchParams } from 'next/navigation'; // 2. Agregado useSearchParams
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';

function LandingContent() { // Movimos el contenido a un subcomponente
  const router = useRouter();
  const searchParams = useSearchParams(); // 3. Obtener los params
  const [isChecking, setIsChecking] = useState(true);

  // Convertir los parámetros actuales a string (ej: ?fecha=2024-01-01)
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

  useEffect(() => {
    const session = localStorage.getItem('auth_token');
    if (session) {
      router.push(`/dashboard${queryString}`); // 4. Usar la variable correcta
    } else {
      setIsChecking(false);
    }
  }, [router, queryString]);

  if (isChecking) return null;

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
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

// Exportación principal con Suspense para evitar errores en build
export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
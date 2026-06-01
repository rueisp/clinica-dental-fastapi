'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import { ShieldAlert, Monitor, Layout, Calendar, Mic, FileText } from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

  useEffect(() => {
    const session = localStorage.getItem('auth_token');
    if (session) {
      router.push(`/dashboard${queryString}`);
    } else {
      setIsChecking(false);
    }
  }, [router, queryString]);

  if (isChecking) return null;

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <Navbar />
      <Hero />

      {/* --- SECCIÓN 1: BLINDAJE LEGAL (Naturaleza del servicio) --- */}
      <section className="bg-zinc-50 py-12 border-y border-zinc-100">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-amber-50/60 p-8 rounded-[2rem] border border-amber-200 flex flex-col md:flex-row items-center gap-8 shadow-sm">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight mb-2">Herramienta de Apoyo Administrativo</h3>
              <p className="text-amber-800 leading-relaxed text-sm italic">
                CloudentApp es un software diseñado para facilitar la gestión organizacional. 
                <span className="text-amber-950 font-bold"> No constituye un sistema de historia clínica oficial </span> 
                según la Resolución 3100 de 2019 (Colombia). El odontólogo usuario es el único responsable legal del tratamiento de los datos de sus pacientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Features />

      {/* --- SECCIÓN 2: GESTIÓN SIN COMPLICACIONES (Capturas de GitHub) --- */}
      <section className="py-24 bg-zinc-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">Un vistazo por dentro</h2>
            <p className="text-zinc-500 font-medium max-w-2xl mx-auto">
              Interfaz minimalista diseñada para que te enfoques en lo que importa: tus pacientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Agenda */}
            <div className="group bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-xl transition-all flex flex-col">
              <div className="h-56 bg-zinc-50 rounded-2xl mb-4 overflow-hidden border border-zinc-100 flex items-center justify-center p-4">
                <img src="/agenda.png" alt="Agenda de citas" className="max-w-full max-h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-sm" />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-auto"><Calendar size={18} className="text-blue-600" /> Agenda Inteligente</h4>
            </div>

            {/* Evolución por Voz */}
            <div className="group bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-xl transition-all flex flex-col">
              <div className="h-56 bg-zinc-50 rounded-2xl mb-4 overflow-hidden border border-zinc-100 flex items-center justify-center p-4">
                <img src="/evolucion.png" alt="Evolución por voz" className="max-w-full max-h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-sm" />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-auto"><Mic size={18} className="text-blue-600" /> Evolución por Voz</h4>
            </div>

            {/* Odontograma */}
            <div className="group bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-xl transition-all flex flex-col">
              <div className="h-56 bg-zinc-50 rounded-2xl mb-4 overflow-hidden border border-zinc-100 flex items-center justify-center p-4">
                <img src="/odontograma.png" alt="Odontograma Digital" className="max-w-full max-h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-sm" />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-auto"><Layout size={18} className="text-blue-600" /> Odontograma Interactivo</h4>
            </div>

            {/* Recibo de Pago Rápido */}
            <div className="group bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-xl transition-all flex flex-col">
              <div className="h-56 bg-zinc-50 rounded-2xl mb-4 overflow-hidden border border-zinc-100 flex items-center justify-center p-4">
                <img src="/recibo.png" alt="Recibo de Pago Rápido" className="max-w-full max-h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-sm" />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-auto"><FileText size={18} className="text-blue-600" /> Recibo de Pago Rápido</h4>
            </div>
          </div>
          
          <div className="mt-12 text-center">
             <p className="text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
               <Monitor size={16} /> Optimizada para PC, Tablet y Celular
             </p>
          </div>
        </div>
      </section>

      <Pricing />

      {/* --- PIE DE PÁGINA PROFESIONAL (FOOTER) --- */}
      <footer className="bg-zinc-950 text-white py-20 px-6">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-zinc-800 pb-16">
          <div className="space-y-4">
            <h4 className="text-2xl font-black tracking-tighter">CloudentApp</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Simplificando la práctica dental con tecnología moderna y segura. Hecho en Colombia por y para odontólogos.
            </p>
          </div>
          
          <div className="space-y-4">
            <h5 className="font-black uppercase text-xs tracking-widest text-blue-500">Legal</h5>
            <ul className="space-y-2">
              <li><Link href="/privacidad" className="text-zinc-400 hover:text-white transition-colors text-sm">Aviso de Privacidad</Link></li>
              <li><Link href="/terminos" className="text-zinc-400 hover:text-white transition-colors text-sm">Términos y Condiciones</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="font-black uppercase text-xs tracking-widest text-blue-500">Soporte</h5>
            <p className="text-zinc-400 text-sm">¿Dudas o sugerencias?</p>
            <p className="font-bold text-white tracking-tight">tucorreo@ejemplo.com</p>
          </div>
        </div>
        <div className="container mx-auto max-w-6xl pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-600 gap-4">
          <p>© 2026 CloudentApp. Todos los derechos reservados.</p>
          <p className="bg-zinc-900 px-3 py-1 rounded-full">Operado por Luis Pitre - Proveedor Tecnológico</p>
        </div>
      </footer>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
'use client';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-16">
      {/* Decoración de fondo sutil */}
      <div className="absolute top-0 right-0 -z-10 translate-x-1/2 -translate-y-1/2 opacity-10">
        <div className="w-[600px] h-[600px] rounded-full border-[60px] border-blue-600"></div>
      </div>

      <div className="container mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8 border border-blue-100">
          <CheckCircle2 size={14} /> Diseñado por dentistas para dentistas
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 mb-8 tracking-tighter leading-[0.9]">
          Software dental que <br />
          <span className="text-blue-600">organiza tu consulta</span>
        </h1>
        
        <p className="text-xl text-zinc-500 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
          Gestiona pacientes, agenda, historias clínicas y pagos desde un solo lugar. 
          Menos papeleo, más tiempo con tus pacientes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/registro" className="group bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-300 flex items-center gap-2">
            PROBAR GRATIS 7 DÍAS <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#precios" className="text-zinc-600 font-bold hover:text-zinc-900 transition-colors px-6 py-4">
            Ver planes y precios
          </Link>
        </div>
      </div>
    </section>
  );
}
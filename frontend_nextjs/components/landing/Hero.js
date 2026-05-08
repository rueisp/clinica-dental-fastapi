'use client';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-purple-50 to-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Software dental que <br />
          <span className="text-purple-600">simplifica tu día a día</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
          Gestiona pacientes, agenda, historias clínicas y pagos desde un solo lugar. 
          Diseñado por dentistas para dentistas.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/registro" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700">
            Probar Gratis
          </Link>
          <Link href="#precios" className="border border-purple-600 text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50">
            Ver Planes
          </Link>
        </div>
      </div>
    </section>
  );
}
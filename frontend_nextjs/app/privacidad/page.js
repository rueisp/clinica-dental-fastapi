'use client';
import Navbar from '@/components/landing/Navbar';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="bg-white min-h-screen text-zinc-900">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-bold mb-8 hover:text-blue-700 transition-colors">
          <ArrowLeft size={20} /> Volver al inicio
        </Link>

        <header className="border-b border-zinc-100 pb-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-blue-600" size={32} />
            <h1 className="text-4xl font-black tracking-tighter uppercase">Aviso de Privacidad</h1>
          </div>
          <p className="text-zinc-500 font-medium">Última actualización: 26 de febrero de 2026</p>
        </header>

        <article className="prose prose-zinc max-w-none space-y-10">
          <section>
            <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-blue-600 pl-4 mb-4">1. Responsable del Tratamiento</h2>
            <p className="text-zinc-600 leading-relaxed">
              <strong>CloudentApp</strong> es una aplicación operada por <b>Rueis Pitre</b>, dentista emprendedor, actuando como proveedor tecnológico. Contacto legal y de privacidad: <span className="text-blue-600 font-bold">cloudentapp.cliente@gmail.com</span>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-blue-600 pl-4 mb-4">2. Información que Recolectamos</h2>
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 space-y-3">
              <p><strong>De los odontólogos usuarios:</strong> nombre, correo electrónico, número de contacto, nombre de consultorio y especialidad.</p>
              <p><strong>De los pacientes:</strong> nombres, datos de contacto, historia clínica, imágenes/radiografías, odontograma e historial de interacciones a través del asistente de WhatsApp y la bandeja de mensajes. Esta información es almacenada por CloudentApp por cuenta y bajo la total responsabilidad del odontólogo usuario.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-blue-600 pl-4 mb-4">3. Finalidades del Tratamiento</h2>
            <ul className="list-disc pl-6 text-zinc-600 space-y-2">
              <li>Permitir la gestión clínica, agenda de citas y cobros por parte del odontólogo.</li>
              <li>Procesar la atención automatizada de consultas frecuentes mediante el asistente virtual y la bandeja de WhatsApp autorizada por el usuario.</li>
              <li>Almacenar y respaldar la información clínica que el odontólogo ingresa a la plataforma.</li>
              <li>Proveer soporte técnico y comunicaciones operativas del servicio.</li>
            </ul>
          </section>

          <section className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
            <h2 className="text-xl font-black uppercase tracking-tight text-blue-900 mb-4 text-center">4. Responsabilidad del Usuario (Odontólogo)</h2>
            <p className="text-blue-800 leading-relaxed italic text-center">
              El odontólogo usuario <strong>es el único responsable</strong> del tratamiento de los datos personales de sus pacientes, incluyendo datos sensibles de salud, conforme a la <b>Ley 1581 de 2012</b> (Habeas Data). CloudentApp actúa estrictamente como <strong>encargado del tratamiento tecnológico</strong>.
            </p>
          </section>

          {/* SECCIÓN PRIVACIDAD DE WHATSAPP */}
          <section>
            <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-blue-600 pl-4 mb-4">5. Privacidad en las Comunicaciones de WhatsApp</h2>
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 text-zinc-600 leading-relaxed space-y-2">
              <p>
                Las conversaciones, mensajes y consultas recibidas a través de la integración de WhatsApp son tratadas con estricta confidencialidad y son de propiedad exclusiva de la cuenta del odontólogo.
              </p>
              <p className="font-semibold text-zinc-800">
                CloudentApp nunca comercializa, analiza con fines publicitarios, cede ni transfiere a terceros las conversaciones ni la información de contacto de los pacientes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-blue-600 pl-4 mb-4">6. Derechos, Seguridad y Vigencia</h2>
            <p className="text-zinc-600 mb-4">Los usuarios pueden conocer, actualizar o rectificar sus datos escribiendo directamente a <span className="text-blue-600 font-bold">cloudentapp.cliente@gmail.com</span>.</p>
            <p className="text-zinc-600">Implementamos encriptación de grado bancario (AES-256 en reposo y TLS 1.3 en tránsito) y acceso restringido respaldado por la infraestructura de Google Cloud y Supabase. Los datos se conservan mientras la cuenta esté activa y 60 días adicionales tras la cancelación para permitir la descarga de copias de seguridad.</p>
          </section>
        </article>
      </main>

      <footer className="bg-zinc-950 text-zinc-500 py-12 px-6 text-center text-sm border-t border-zinc-900">
        <p>© 2026 CloudentApp. Herramienta de apoyo administrativo.</p>
      </footer>
    </div>
  );
}
'use client';
import Navbar from '@/components/landing/Navbar';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';

export default function TerminosPage() {
  return (
    <div className="bg-white min-h-screen text-zinc-900">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-bold mb-8 hover:text-blue-700 transition-colors">
          <ArrowLeft size={20} /> Volver al inicio
        </Link>

        <header className="border-b border-zinc-100 pb-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-blue-600" size={32} />
            <h1 className="text-4xl font-black tracking-tighter uppercase">Términos y Condiciones</h1>
          </div>
          <p className="text-zinc-500 font-medium">Fecha de entrada en vigencia: 26 de febrero de 2026</p>
        </header>

        <div className="space-y-12">
          {/* BLOQUE DE ADVERTENCIA LEGAL CRÍTICO */}
          <section className="bg-zinc-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 border-l-8 border-blue-600">
            <AlertTriangle size={60} className="text-blue-500 shrink-0" />
            <div>
              <h2 className="text-xl font-black uppercase mb-2 tracking-tight">Aviso de Naturaleza del Servicio</h2>
              <p className="text-zinc-400 leading-tight">
                CloudentApp es una <strong>herramienta de apoyo administrativo</strong>. 
                <span className="text-white"> No constituye un sistema de historia clínica oficial </span> 
                ni reemplaza los registros exigidos por la normativa sanitaria colombiana 
                (Resolución 3100 de 2019).
              </p>
            </div>
          </section>

          <article className="prose prose-zinc max-w-none space-y-8 text-zinc-600">
            <section>
              <h3 className="text-lg font-black text-zinc-900 uppercase">1. Aceptación</h3>
              <p>Al utilizar CloudentApp, el odontólogo usuario acepta íntegramente estos términos. El Usuario es un profesional independiente y único responsable por la veracidad de los datos ingresados.</p>
            </section>

            <section>
              <h3 className="text-lg font-black text-zinc-900 uppercase">2. Responsabilidad del Odontólogo</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Garantizar el cumplimiento de la Ley 1581 de 2012 (Habeas Data).</li>
                <li>Obtener consentimientos informados de sus pacientes.</li>
                <li>Realizar copias de respaldo mediante las herramientas de exportación (Word/Excel).</li>
              </ul>
            </section>

            {/* SECCIÓN DE SEGURIDAD Y BLINDAJE LEGAL */}
            <section className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
              <h3 className="text-lg font-black text-red-950 uppercase flex items-center gap-2">
                ⚠️ 3. Política de Uso Aceptable y Suspensión de Servicio
              </h3>
              <p className="text-red-900 text-sm mt-2 leading-relaxed">
                CloudentApp promueve un entorno seguro y profesional. Queda estrictamente prohibido el uso de la plataforma para almacenar, transmitir o procesar material que sea ilegal, difamatorio, obsceno, ofensivo o que infrinja derechos de propiedad intelectual.
              </p>
              <p className="text-red-900 text-sm mt-2 leading-relaxed font-bold">
                Nos reservamos el derecho unilateral de suspender temporalmente o rescindir de forma definitiva y sin previo aviso el acceso a cualquier cuenta que:
              </p>
              <ul className="list-disc pl-6 mt-2 text-red-900 text-xs space-y-1">
                <li>Suba imágenes inadecuadas, obscenas, de contenido explícito no clínico o ajenas a la práctica odontológica.</li>
                <li>Registre textos ofensivos, difamatorios o lenguaje inapropiado en las evoluciones, observaciones o fichas de pacientes.</li>
                <li>Realice actividades que saturen, comprometan o intenten vulnerar la seguridad de los servidores de CloudentApp.</li>
                <li>Incurra en impago de las tarifas correspondientes a los planes profesionales contratados.</li>
              </ul>
              <p className="text-red-900 text-xs mt-2 italic">
                La suspensión por violación a esta política no dará derecho a reembolsos ni indemnizaciones de ningún tipo.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-zinc-900 uppercase">4. Suscripciones y Pagos</h3>
              <p>Ofrecemos una prueba gratuita de 7 días. Los planes profesionales se activan mediante reporte de pago manual. CloudentApp se reserva el derecho de suspender el acceso ante la falta de pago o uso indebido.</p>
            </section>

            {/* 📱 NUEVA SECCIÓN DE INTEGRACIÓN WHATSAPP */}
            <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-lg font-black text-blue-950 uppercase flex items-center gap-2">
                📱 5. Integración del Asistente de WhatsApp y Dispositivos Vinculados
              </h3>
              <p className="text-blue-900 text-sm mt-2 leading-relaxed">
                El módulo de atención automatizada y mensajería opera como una extensión autorizada de la cuenta de WhatsApp del Usuario a través del protocolo oficial de dispositivos vinculados. El Usuario conserva el control total de su línea y puede vincular o revocar el acceso en cualquier momento directamente desde la plataforma o desde su aplicación móvil de WhatsApp.
              </p>
              <p className="text-blue-900 text-sm mt-2 leading-relaxed">
                Por protocolos de seguridad y sincronización propios de WhatsApp, las sesiones pueden requerir una renovación periódica mediante escaneo de código QR (por ejemplo, ante inactividad prolongada del dispositivo principal o actualizaciones de seguridad de la red). CloudentApp emitirá una alerta visual en el panel del Usuario para facilitar su reconexión inmediata en 1 solo clic. El Usuario es el único responsable por la gestión y contenido de las comunicaciones dirigidas a sus pacientes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-zinc-900 uppercase">6. Limitación de Responsabilidad</h3>
              <p>CloudentApp no se hace responsable por pérdida de datos ajena a nuestra voluntad, ni por reclamaciones de terceros derivadas del ejercicio profesional del Usuario.</p>
            </section>

            <section className="pt-8 border-t border-zinc-100">
              <p className="text-sm font-bold italic">Estos términos se rigen por las leyes de la República de Colombia.</p>
              <p className="text-sm">Contacto legal: <span className="text-blue-600 font-bold text-lg">cloudentapp.cliente@gmail.com</span></p>
            </section>
          </article>
        </div>
      </main>

      <footer className="bg-zinc-950 text-zinc-500 py-12 px-6 text-center text-sm border-t border-zinc-900">
        <p>© 2026 CloudentApp. Creado por odontólogos para odontólogos.</p>
      </footer>
    </div>
  );
}
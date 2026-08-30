'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import SecurityTrust from '@/components/landing/SecurityTrust';
import { 
  ShieldAlert, Monitor, Layout, Calendar, Mic, FileText, 
  Bot, MessageSquare, Sparkles, CheckCircle2, Zap, Clock, DollarSign 
} from 'lucide-react';

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
                CloudentApp es un software diseñado para facilitar la gestión organizacional y la atención al paciente. 
                <span className="text-amber-950 font-bold"> No constituye un sistema de historia clínica oficial </span> 
                según la Resolución 3100 de 2019 (Colombia). El odontólogo usuario es el único responsable legal del tratamiento de los datos de sus pacientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Features />

      {/* --- SECCIÓN 2: SPOTLIGHT ESTRELLA: ASISTENTE WHATSAPP IA 24/7 --- */}
      <section className="py-24 bg-zinc-950 text-white overflow-hidden relative">
        {/* Resplandor decorativo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-green-500/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-green-500/20">
              <Sparkles size={14} /> La Innovación de CloudentApp
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Tu Consultorio Atendiendo Pacientes en WhatsApp 24/7
            </h2>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
              Mientras estás en procedimiento quirúrgico o fuera del horario laboral, la Inteligencia Artificial de CloudentApp 
              responde dudas, entrega tus tarifas en COP y orienta a tus pacientes al instante.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Columna Izquierda: Pilares del Bot */}
            <div className="space-y-6">
              <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-3xl hover:border-green-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500/10 text-green-400 rounded-2xl shrink-0">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Catálogo y Tarifas Propias en COP</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      El bot no improvisa precios genéricos: consulta tu catálogo en vivo y responde con lo que tú cobras exactamente por resinas, limpieza, ortodoncia o extracciones.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-3xl hover:border-blue-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl shrink-0">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Horarios y Ubicación Exacta</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Informa tu dirección, puntos de referencia y jornadas de atención (Lunes a Sábado) para que ningún paciente se quede sin saber cuándo acudir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-3xl hover:border-purple-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl shrink-0">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Atención Híbrida & Silencio Humano</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Tú tienes el control total: puedes intervenir en cualquier momento desde tu bandeja web (<span className="text-white font-mono">/chat</span>) y el bot se silencia automáticamente para no interrumpirte.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Simulación Visual de WhatsApp */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-2xl flex items-center justify-center font-bold">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Consultorio Odontológico</h4>
                    <p className="text-[10px] text-green-400 flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> En línea • Asistente IA 24/7
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full font-bold uppercase">
                  WhatsApp Oficial
                </span>
              </div>

              {/* Mensajes Simulados */}
              <div className="space-y-4 text-xs">
                {/* 1. Mensaje del Paciente */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-zinc-800 text-zinc-200 p-3.5 rounded-2xl rounded-tl-sm border border-zinc-700/50">
                    <p className="text-[10px] text-zinc-400 font-bold mb-1">Paciente</p>
                    <p className="text-sm font-medium">
                      Hola, buenas tardes 👋 ¿Cuánto vale una calza y en qué horarios atienden?
                    </p>
                    <span className="block text-[9px] text-zinc-500 text-right mt-1 font-mono">10:14 AM</span>
                  </div>
                </div>

                {/* 2. Respuesta Automática del Bot */}
                <div className="flex justify-end">
                  <div className="max-w-[90%] bg-green-950/80 border border-green-800/60 text-green-100 p-4 rounded-2xl rounded-tr-sm shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-green-800/40 pb-1">
                      <span className="text-[10px] font-black uppercase text-green-300 flex items-center gap-1">
                        <Bot size={12} /> Asistente Virtual (Bot)
                      </span>
                      <span className="text-[9px] text-green-400 font-bold">0.2s</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      ¡Hola! 🦷 En nuestro consultorio realizamos <strong>Restauraciones en Resina de alta estética</strong> desde <strong>$100.000 COP</strong>.<br /><br />
                      📅 <strong>Horarios de Atención:</strong><br />
                      • Lunes a Viernes: 9:00 AM - 12:00 M / 2:00 PM - 6:00 PM<br />
                      • Sábados: 9:00 AM - 5:00 PM<br /><br />
                      ¿Te gustaría agendar una cita de valoración? 📅
                    </p>
                    <span className="block text-[9px] text-green-400/60 text-right mt-1 font-mono">10:14 AM ✓✓</span>
                  </div>
                </div>

                {/* 3. Intervención en vivo del Doctor */}
                <div className="flex justify-end">
                  <div className="max-w-[90%] bg-blue-950/80 border border-blue-800/60 text-blue-100 p-3.5 rounded-2xl rounded-tr-sm shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-1 border-b border-blue-800/40 pb-1">
                      <span className="text-[10px] font-black uppercase text-blue-300">
                        👨‍⚕️ Dr. (Intervención en Vivo)
                      </span>
                    </div>
                    <p className="text-xs font-medium">
                      Hola, con gusto te atiendo personalmente. ¿Prefieres tu cita para mañana en la mañana o en la tarde?
                    </p>
                    <span className="block text-[9px] text-blue-400/60 text-right mt-1 font-mono">10:15 AM ✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN 3: GESTIÓN SIN COMPLICACIONES (Capturas de Software) --- */}
      <section className="py-24 bg-zinc-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">Un vistazo por dentro</h2>
            <p className="text-zinc-500 font-medium max-w-2xl mx-auto">
              Interfaz minimalista diseñada para que te enfoques en lo que importa: tus pacientes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 justify-items-center">
            {/* Agenda Inteligente */}
            <div className="group flex flex-col items-center">
              <div className="relative w-[240px] aspect-[9/19] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-100/50">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-900 rounded-full z-10" />
                <img src="/agenda.png" alt="Agenda de citas" className="w-full h-full object-cover" style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }} />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-6 text-zinc-800 text-lg">
                <Calendar size={20} className="text-blue-600" /> Agenda Inteligente
              </h4>
            </div>

            {/* Evolución por Voz */}
            <div className="group flex flex-col items-center">
              <div className="relative w-[240px] aspect-[9/19] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-100/50">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-900 rounded-full z-10" />
                <img src="/evolucion.png" alt="Evolución por voz" className="w-full h-full object-cover" style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }} />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-6 text-zinc-800 text-lg">
                <Mic size={20} className="text-blue-600" /> Evolución por Voz
              </h4>
            </div>

            {/* Odontograma Interactivo */}
            <div className="group flex flex-col items-center">
              <div className="relative w-[240px] aspect-[9/19] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-100/50">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-900 rounded-full z-10" />
                <img src="/odontograma.png" alt="Odontograma Digital" className="w-full h-full object-cover" style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }} />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-6 text-zinc-800 text-lg">
                <Layout size={20} className="text-blue-600" /> Odontograma Interactivo
              </h4>
            </div>

            {/* Recibo de Pago Rápido */}
            <div className="group flex flex-col items-center">
              <div className="relative w-[240px] aspect-[9/19] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-100/50">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-900 rounded-full z-10" />
                <img src="/recibo.png" alt="Recibo de Pago Rápido" className="w-full h-full object-cover" style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }} />
              </div>
              <h4 className="font-bold flex items-center gap-2 mt-6 text-zinc-800 text-lg">
                <FileText size={20} className="text-blue-600" /> Recibo de Pago Rápido
              </h4>
            </div>
          </div>
          
          <div className="mt-12 text-center">
             <p className="text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
               <Monitor size={16} /> Optimizada para PC, Tablet y Celular
             </p>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN 4: SEGURIDAD Y CONFIANZA --- */}
      <SecurityTrust />

      {/* --- SECCIÓN 5: PLANES Y PRECIOS --- */}
      <Pricing />

      {/* --- PIE DE PÁGINA (FOOTER) --- */}
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
            <p className="font-bold text-white tracking-tight">cloudentapp.cliente@gmail.com</p>
          </div>
        </div>
        <div className="container mx-auto max-w-6xl pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-600 gap-4">
          <p>© 2026 CloudentApp. Todos los derechos reservados.</p>
          <p className="bg-zinc-900 px-3 py-1 rounded-full">Operado por Rueis Pitre - Proveedor Tecnológico</p>
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
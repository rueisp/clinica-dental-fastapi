'use client';
import { ShieldCheck, Lock, Mic, Server, FileSpreadsheet } from 'lucide-react';

export default function SecurityTrust() {
  const pilares = [
    {
      icon: <ShieldCheck className="w-7 h-7 text-blue-400" />,
      title: "Propiedad 100% de tus Datos",
      desc: "Los registros son exclusivamente tuyos. Actuamos como Encargados Tecnológicos bajo la Ley 1581 (Habeas Data). Nunca comercializamos, analizamos ni cederemos tu información a terceros."
    },
    {
      icon: <FileSpreadsheet className="w-7 h-7 text-green-400" />,
      title: "Portabilidad Garantizada (Backup Excel)",
      desc: "Descarga una copia de seguridad completa de tus pacientes e historias clínicas a Excel en 1 clic. Tu información nunca queda retenida, incluso si tu plan llega a vencer."
    },
    {
      icon: <Mic className="w-7 h-7 text-purple-400" />,
      title: "Dictado por Voz 100% Privado",
      desc: "El reconocimiento de voz para tus evoluciones se procesa directamente en tu navegador o dispositivo. Ningún audio ni grabación se almacena en nuestros servidores."
    },
    {
      icon: <Server className="w-7 h-7 text-blue-400" />,
      title: "Infraestructura Google Cloud + Supabase",
      desc: "Cifrado de grado bancario (AES-256 en reposo) y conexiones cifradas (TLS 1.3 en tránsito) respaldados por la nube de Google Platform."
    }
  ];

  return (
    <section id="seguridad" className="py-20 bg-zinc-950 text-white border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-blue-500/20">
            <Lock size={14} /> Compromiso de Seguridad & Privacidad
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Tus datos clínicos protegidos y bajo tu control total
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Diseñado para dar tranquilidad a tu consultorio con tecnología de clase mundial y absoluta transparencia legal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {pilares.map((p, i) => (
            <div key={i} className="bg-zinc-900/80 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/40 transition-all shadow-xl">
              <div className="p-3 bg-zinc-950 w-fit rounded-2xl mb-5 border border-zinc-800/80">{p.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-white">{p.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
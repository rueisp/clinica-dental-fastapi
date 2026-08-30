'use client';
import { Bot, Users, Calendar, Layout, Mic, Zap } from 'lucide-react';

export default function Features() {
  const features = [
    { 
      icon: <Bot className="w-8 h-8 text-green-600" />, 
      title: "Asistente WhatsApp IA 24/7", 
      description: "Tu bot responde inquietudes, ubicación y entrega tus precios oficiales en COP al instante con Inteligencia Artificial.",
      highlight: true
    },
    { 
      icon: <Users className="w-8 h-8 text-blue-600" />, 
      title: "Gestión de Pacientes", 
      description: "Fichas clínicas completas, antecedentes, datos de contacto y copia de seguridad en Excel con un solo clic." 
    },
    { 
      icon: <Calendar className="w-8 h-8 text-blue-600" />, 
      title: "Agenda Inteligente", 
      description: "Organiza tu día en franjas de 30 minutos y envía recordatorios directos a WhatsApp para evitar inasistencias." 
    },
    { 
      icon: <Layout className="w-8 h-8 text-blue-600" />, 
      title: "Odontograma Digital", 
      description: "Registra caries, resinas, endodoncias y coronas en un odontograma visual interactivo para adultos y niños." 
    },
    { 
      icon: <Mic className="w-8 h-8 text-blue-600" />, 
      title: "Evolución Clínica por Voz", 
      description: "Dicta la evolución de tu paciente y el sistema la transcribe en tiempo real con corrección odontológica." 
    },
    { 
      icon: <Zap className="w-8 h-8 text-blue-600" />, 
      title: "Cobros Rápidos y Recibos", 
      description: "Genera recibos digitales de pago en 3 segundos y compártelos automáticamente por WhatsApp con tus pacientes." 
    }
  ];

  return (
    <section id="funciones" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que tu consultorio necesita</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Herramientas clínicas y automatización diseñadas específicamente para odontólogos.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div 
              key={i} 
              className={`p-6 rounded-2xl border transition-all ${
                f.highlight 
                  ? 'bg-green-50/40 border-green-200 shadow-md shadow-green-50' 
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                {f.title}
                {f.highlight && (
                  <span className="bg-green-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Top
                  </span>
                )}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
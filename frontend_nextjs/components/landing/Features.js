'use client';
import { Users, Calendar, FileText, Activity, Shield, Zap } from 'lucide-react';

export default function Features() {
  const features = [
    { icon: <Users className="w-8 h-8 text-purple-600" />, title: "Gestión de Pacientes", description: "Administra toda la información clínica de tus pacientes de forma centralizada." },
    { icon: <Calendar className="w-8 h-8 text-purple-600" />, title: "Agenda Inteligente", description: "Organiza tus citas y evita ausencias con recordatorios automáticos." },
    { icon: <FileText className="w-8 h-8 text-purple-600" />, title: "Odontograma Digital", description: "Registra el estado dental con nuestro odontograma interactivo." },
    { icon: <Activity className="w-8 h-8 text-purple-600" />, title: "Evolución por Voz", description: "Dicta las evoluciones y el sistema las transcribe automáticamente." },
    { icon: <Shield className="w-8 h-8 text-purple-600" />, title: "Datos Seguros", description: "Información protegida y respaldada en la nube." },
    { icon: <Zap className="w-8 h-8 text-purple-600" />, title: "Cobros Rápidos", description: "Registra pagos en segundos y envía recibos por WhatsApp." }
  ];

  return (
    <section id="funciones" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que necesitas</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Herramientas diseñadas específicamente para odontólogos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-xl">
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-gray-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
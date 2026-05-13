'use client';

import { Pencil, Phone, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, authFetch } from '@/config/api';
import { useState, useEffect, useMemo, useRef } from 'react';

export default function AgendaDiaria({ fecha }) {
  const router = useRouter();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const citasCache = useRef({});

  const horarios = useMemo(() => {
    const horariosTemp = [];
    for (let hora = 8; hora <= 20; hora++) {
      horariosTemp.push(`${hora.toString().padStart(2, '0')}:00`);
      if (hora < 20) {
        horariosTemp.push(`${hora.toString().padStart(2, '0')}:30`);
      }
    }
    return horariosTemp;
  }, []);

  useEffect(() => {
    const cargarCitas = async (fechaStr) => {
      if (citasCache.current[fechaStr]) {
        setCitas(citasCache.current[fechaStr]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await authFetch(`${API_BASE_URL}/api/citas/por-fecha?fecha=${fechaStr}`);
        if (response.ok) {
          const data = await response.json();
          const citasData = data.citas || [];
          citasCache.current[fechaStr] = citasData;
          setCitas(citasData);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (fecha) cargarCitas(fecha);
  }, [fecha]);

  const getCitaEnHora = (hora) => citas.find(c => c.hora === hora);

  const enviarWhatsApp = (telefono, nombre, hora) => {
    const mensaje = `Hola ${nombre}, te recordamos tu cita a las ${hora}.`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };
  
  return (

    <div className="bg-white -mx-4 sm:mx-0 border-t border-gray-200 sm:border sm:rounded-2xl sm:shadow-sm overflow-hidden">
      {/* CÁPSULA DE RESUMEN DIARIO */}


      <div className="flex justify-center py-4 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-4 py-1 rounded-full shadow-sm">
          {/* El punto sólido azul */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
          
          {/* Texto dinámico */}
          <span className="text-sm font-bold text-gray-700">
            {citas.length} {citas.length === 1 ? 'cita agendada' : 'citas agendadas'}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {horarios.map((hora) => {
          const cita = getCitaEnHora(hora);
          return (
            <div 
              key={hora} 
              /* border-b crea la línea que cruza de lado a lado */
              className="flex items-center py-4 px-6 border-b border-gray-300 hover:bg-gray-50 transition-colors min-h-[64px]"
            >
              {/* Hora: Más marcada y con más espacio (como en consultorio.me) */}
              <div className="w-16 text-base font-bold text-gray-800 tabular-nums">
                {hora}
              </div>

              <div className="flex-1 min-w-0 ml-6">
                {cita ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center min-w-0 gap-3 flex-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></span>
                      <div className="flex flex-col sm:flex-row sm:items-baseline min-w-0 gap-0 sm:gap-2">
                        <button 
                          onClick={() => router.push(`/pacientes/${cita.paciente_id}`)}
                          className="text-base font-bold text-blue-600 hover:underline truncate capitalize text-left"
                        >
                          {cita.paciente_nombre?.toLowerCase()}
                        </button>
                        {cita.motivo && (
                          <span className="text-sm text-gray-400 truncate italic font-normal">
                            {cita.motivo}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {cita.telefono && (
                        <button onClick={() => enviarWhatsApp(cita.telefono, cita.paciente_nombre, cita.hora)} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors">
                          <Phone size={20} />
                        </button>
                      )}
                      <button onClick={() => router.push(`/citas/editar/${cita.id}`)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                        <Pencil size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Botón de agendar más discreto pero amplio */
                  <button 
                    onClick={() => router.push(`/citas/nueva?fecha=${fecha}&hora=${hora}`)}
                    className="w-full text-left text-gray-400 hover:text-gray-500 text-sm transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Agendar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
'use client';

import { Pencil, Phone, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useMemo, memo } from 'react';
import { getFechaHoyLocal } from '@/app/utils/fechas'; 

const AgendaDiaria = memo(function AgendaDiaria({ fecha, citasExternas, loading }) {
  const router = useRouter();
  
  // 1. Usamos las citas que vienen del Dashboard (o un array vacío por defecto)
  const citas = citasExternas || [];

  // 2. Generación de franjas horarias
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

  // Agrupamos las citas por hora en un mapa de arrays para soportar múltiples citas por hora
  const mapaCitas = useMemo(() => {
    const mapa = {};
    citas.forEach(c => {
      if (c.hora) {
        if (!mapa[c.hora]) {
          mapa[c.hora] = [];
        }
        mapa[c.hora].push(c);
      }
    });
    return mapa;
  }, [citas]);

  // Retorna un array con todas las citas de esa hora, o un array vacío si no hay ninguna
  const getCitasEnHora = (hora) => mapaCitas[hora] || [];

  const enviarWhatsApp = (telefono, nombre, hora) => {
    // 1. Obtener fecha de hoy en formato YYYY-MM-DD
    const hoyStr = getFechaHoyLocal();
    
    // 2. Calcular fecha de mañana de forma segura
    const [year, month, day] = hoyStr.split('-').map(Number);
    const mananaObj = new Date(year, month - 1, day + 1);
    const mananaStr = `${mananaObj.getFullYear()}-${String(mananaObj.getMonth() + 1).padStart(2, '0')}-${String(mananaObj.getDate()).padStart(2, '0')}`;

    // 3. Determinar el conector temporal dinámico
    let conectorTemporal = `el día ${fecha.split('-').reverse().join('/')}`; // Fallback por si es otra fecha
    
    if (fecha === hoyStr) {
      conectorTemporal = "el día de hoy";
    } else if (fecha === mananaStr) {
      conectorTemporal = "mañana";
    }

    // 4. Formatear el nombre del paciente (Capitalize)
    const nombreFormateado = nombre.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

    // 5. Construir el mensaje personalizado
    const mensaje = `Hola ${nombreFormateado}, te recordamos tu cita odontológica ${conectorTemporal} a las ${hora}. Me confirmas por favor si puedes asistir.`;
    
    // 6. Limpiar el teléfono (solo números) y abrir WhatsApp
    const telLimpio = telefono.replace(/\D/g, '');
    window.open(`https://wa.me/57${telLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="relative bg-white -mx-4 sm:mx-0 border-t border-gray-200 sm:border sm:rounded-2xl sm:shadow-sm overflow-hidden transition-all duration-300">
      
      {/* Inyección de animación CSS nativa para la barra de carga */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes loadingBar {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}} />

      {/* BARRA DE CARGA SUTIL EN LA PARTE SUPERIOR (Sin saltos de pantalla) */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-50 overflow-hidden z-10">
          <div 
            className="absolute top-0 h-full bg-blue-600" 
            style={{ 
              width: '30%', 
              animation: 'loadingBar 1.5s infinite linear' 
            }} 
          />
        </div>
      )}

      {/* CÁPSULA DE RESUMEN DIARIO */}
      <div className="flex justify-center py-4 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-4 py-1 rounded-full shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
          <span className="text-sm font-bold text-gray-700">
            {citas.length} {citas.length === 1 ? 'cita agendada' : 'citas agendadas'}
          </span>
        </div>
      </div>

      {/* CONTENEDOR DE HORARIOS CON OPACIDAD SUAVE SI ESTÁ CARGANDO */}
      <div className={`flex flex-col transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        {horarios.map((hora) => {
          const citasEnEstaHora = getCitasEnHora(hora); // <-- Obtenemos todas las citas de esta hora
          const tieneCitas = citasEnEstaHora.length > 0;

          return (
            <div 
              key={hora} 
              className="flex items-start py-4 px-6 border-b border-gray-300 hover:bg-gray-50 transition-colors min-h-[64px]"
            >
              {/* Hora de la franja (alineada arriba si hay múltiples citas) */}
              <div className="w-16 text-base font-bold text-gray-800 tabular-nums pt-1">
                {hora}
              </div>

              <div className="flex-1 min-w-0 ml-6 space-y-3">
                {tieneCitas ? (
                  // Pintamos cada una de las citas de esta hora una debajo de la otra
                  citasEnEstaHora.map((cita) => (
                    <div key={cita.id} className="flex items-center justify-between gap-4 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                      <div className="flex items-center min-w-0 gap-3 flex-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></span>
                        <div className="flex flex-col sm:flex-row sm:items-baseline min-w-0 gap-0 sm:gap-2">
                          <button 
                            onClick={() => cita.paciente_id && router.push(`/pacientes/${cita.paciente_id}`)}
                            className={`text-base font-bold truncate capitalize text-left transition-colors ${
                              cita.paciente_id 
                                ? 'text-blue-600 hover:underline cursor-pointer' 
                                : 'text-gray-900 cursor-default'
                            }`}
                          >
                            {cita.paciente_nombre?.toLowerCase()}
                          </button>
                          {cita.motivo && (
                            <span className="text-sm text-gray-400 truncate italic font-normal">
                              {cita.motivo}
                            </span>
                          )}
                          {/* Si eres admin, te muestra qué doctor atiende esta cita */}
                          {cita.doctor && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-bold">
                              {cita.doctor}
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
                  ))
                ) : (
                  <button 
                    type="button"
                    onClick={() => router.push(`/citas/nueva?fecha=${fecha}&hora=${hora}`)}
                    className="w-full text-left text-gray-400 hover:text-gray-500 text-sm transition-colors flex items-center gap-1 cursor-pointer pt-1"
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
});

export default AgendaDiaria;
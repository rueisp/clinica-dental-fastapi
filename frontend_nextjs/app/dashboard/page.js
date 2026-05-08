'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// 1. Librerías Externas
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LayoutList, CalendarDays, Grid3X3, Zap, ChevronLeft, ChevronRight, DollarSign, User, Users } from 'lucide-react';

// 2. Configuración y Auth (Están en la raíz)
import { authFetch, API_ENDPOINTS } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';

// 3. Componentes de UI y Dashboard (Están en la raíz /components)
import PlanAlerta from '@/components/dashboard/PlanAlerta';

// 4. TUS NUEVAS VISTAS (Están dentro de app/components/dashboard)
import AgendaDiaria from '@/app/components/dashboard/AgendaDiaria'; 
import AgendaSemanal from '@/app/components/dashboard/AgendaSemanal'; 

// 5. Utils y Estilos (Están dentro de app)
import { getFechaHoyLocal, formatearFechaLocal } from '@/app/utils/fechas';
import './calendar-styles.css';

export default function DashboardPage() {
  const router = useRouter(); // <-- AÑADE ESTA LÍNEA
  const searchParams = useSearchParams();
  const [vista, setVista] = useState('dia'); // 'dia' o 'mes'
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getFechaHoyLocal());
  const [eventos, setEventos] = useState([]);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

    const fetchDashboardData = async () => {
      try {
        const response = await authFetch(API_ENDPOINTS.DASHBOARD_HOME_DATA);
        const data = await response.json();
        if (data.success) {
          setUsuario(data.usuario);
          const evs = data.eventos.map(e => ({
            ...e,
            title: `${e.title?.match(/\d+/)?.[0] || '0'}`
          }));
          setEventos(evs);
        }
      } catch (err) {
        console.error('Error cargando Dashboard:', err);
      }
    };

  const cambiarFecha = (offset) => {
    const d = new Date(fechaSeleccionada + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const nuevaFecha = formatearFechaLocal(d);
    setFechaSeleccionada(nuevaFecha);
    // Opcional: limpiar la URL para que no se quede el ?fecha=... pegado
    router.replace(`/?fecha=${nuevaFecha}`, { scroll: false });
  };

return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 pb-20">
        
        {/* HEADER: Mantiene px-4 para que el texto no toque los bordes */}
        <div className="px-4 pt-6 pb-4 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black leading-tight">
                Hola, {usuario?.nombre || 'test_user'}!
              </h1>
              <p className="text-gray-500 text-sm font-medium">Panel Clínico</p>
            </div>
            
            {/* SELECTOR DE VISTAS ESTILO NATIVO */}
            <div className="flex bg-gray-200/60 p-1 rounded-xl backdrop-blur-sm">
              <button 
                onClick={() => setVista('dia')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vista === 'dia' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                <LayoutList size={16} />
                <span className="text-[11px] font-bold uppercase tracking-tight">Día</span>
              </button>
              <button 
                onClick={() => setVista('semana')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vista === 'semana' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                <CalendarDays size={16} />
                <span className="text-[11px] font-bold uppercase tracking-tight">Sem</span>
              </button>
              <button 
                onClick={() => setVista('mes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vista === 'mes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                <Grid3X3 size={16} />
                <span className="text-[11px] font-bold uppercase tracking-tight">Mes</span>
              </button>
            </div>
          </div>

          {/* NAVEGACIÓN DE FECHA (Solo en día y semana) */}
          {vista !== 'mes' && (
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              <button onClick={() => cambiarFecha(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-sm font-bold capitalize text-gray-800">
                {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => cambiarFecha(1)} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="max-w-5xl mx-auto px-4">
          <PlanAlerta />

          {/* VISTA DIARIA */}
          {vista === 'dia' && <AgendaDiaria fecha={fechaSeleccionada} />}

          {/* VISTA SEMANAL */}
          {vista === 'semana' && (
            <div className="-mx-4 sm:mx-0">
              <AgendaSemanal 
                fechaInicio={fechaSeleccionada} 
                onSeleccionarDia={(f) => { setFechaSeleccionada(f); setVista('dia'); }} 
              />
            </div>
          )}

          {/* VISTA MENSUAL: Look iPhone */}
          {vista === 'mes' && (
            <div className="bg-white min-h-[500px]">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale="es"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                events={eventos}
                height="auto"
                dateClick={(info) => {
                  setFechaSeleccionada(info.dateStr);
                  setVista('dia');
                }}
                eventContent={(info) => (
                  <div className="w-full flex justify-center items-center pt-1">
                    <div className="flex items-center gap-1 bg-gray-100 border-2 border-gray-200 px-3 py-0.3 rounded-full transition-transform hover:scale-110">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                      <span className="text-sm font-black text-[#3b82f6] leading-none">
                        {info.event.title}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </div>

        {/* BOTÓN FLOTANTE PACIENTES (Superior) */}
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={() => router.push('/pacientes')}
            className="flex items-center gap-2 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <Users className="w-5 h-5" />
            <span className="font-bold text-sm">Pacientes</span>
          </button>
        </div>


        {/* BOTÓN FLOTANTE COBRO RÁPIDO */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => router.push('/pagos/nuevo?rapido=1')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            <Zap className="w-5 h-5 fill-white" />
            <span className="font-bold text-sm sm:text-base">Cobro Rápido</span>
            <DollarSign className="w-5 h-5" />
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
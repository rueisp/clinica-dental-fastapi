'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LayoutList, CalendarDays, Grid3X3, Zap, ChevronLeft, ChevronRight, DollarSign, Users } from 'lucide-react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';
import PlanAlerta from '@/components/dashboard/PlanAlerta';
import AgendaDiaria from '@/app/components/dashboard/AgendaDiaria';
import AgendaSemanal from '@/app/components/dashboard/AgendaSemanal';
import { getFechaHoyLocal } from '@/app/utils/fechas';
import './calendar-styles.css';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [vista, setVista] = useState('dia');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getFechaHoyLocal());
  const [eventos, setEventos] = useState([]);
  const [usuario, setUsuario] = useState(null);

  // 1. SINCRONIZACIÓN PRIORITARIA (Se ejecuta antes que cualquier fetch)
  useEffect(() => {
    const fechaUrl = searchParams.get('fecha');
    if (fechaUrl && /^\d{4}-\d{2}-\d{2}$/.test(fechaUrl)) {
      // Usamos un pequeño delay o forzamos el estado si es diferente
      if (fechaUrl !== fechaSeleccionada) {
        setFechaSeleccionada(fechaUrl);
      }
    }
  }, [searchParams]);

  // 2. CARGA DE DATOS (IMPORTANTE: Que dependa de la fechaSeleccionada si es necesario)
  useEffect(() => {
    fetchDashboardData();
  }, [fechaSeleccionada]); // Ahora refresca si la fecha cambia significativamente

  // 3. REFRESCO AL CAMBIAR A VISTA MES
  useEffect(() => {
    if (vista === 'mes') {
      fetchDashboardData();
    }
  }, [vista]);

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
    const [year, month, day] = fechaSeleccionada.split('-').map(Number);
    const fechaActual = new Date(year, month - 1, day);
    
    // Si la vista es semana, saltamos 7 días, si no, 1 día
    const diasASaltar = vista === 'semana' ? offset * 7 : offset;
    fechaActual.setDate(fechaActual.getDate() + diasASaltar);
    
    const nuevaFecha = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`;
    
    setFechaSeleccionada(nuevaFecha);
    router.replace(`/dashboard?fecha=${nuevaFecha}`, { scroll: false });
  };

  const formatearFechaMostrar = (fechaStr) => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fechaObj = new Date(year, month - 1, day);
    return fechaObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Cabecera con Padding a la derecha para no chocar con el botón flotante */}
        <div className="px-4 pt-6 pb-4 max-w-5xl mx-auto sm:pr-40">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black leading-tight">
                Hola, {usuario?.nombre || 'Odontólogo'}!
              </h1>
              <p className="text-gray-500 text-sm font-medium">Panel Clínico</p>
            </div>
            
            <div className="flex bg-gray-200/60 p-1 rounded-xl backdrop-blur-sm">
              <button 
                onClick={() => { setVista('dia'); router.replace(`/dashboard?fecha=${fechaSeleccionada}`, { scroll: false }); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vista === 'dia' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                <LayoutList size={16} />
                <span className="text-[11px] font-bold uppercase tracking-tight">Día</span>
              </button>
              <button 
                onClick={() => { setVista('semana'); router.replace(`/dashboard?fecha=${fechaSeleccionada}`, { scroll: false }); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vista === 'semana' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                <CalendarDays size={16} />
                <span className="text-[11px] font-bold uppercase tracking-tight">Sem</span>
              </button>
              <button 
                onClick={() => { setVista('mes'); router.replace(`/dashboard?fecha=${fechaSeleccionada}`, { scroll: false }); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vista === 'mes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                <Grid3X3 size={16} />
                <span className="text-[11px] font-bold uppercase tracking-tight">Mes</span>
              </button>
            </div>
          </div>

          {vista !== 'mes' && (
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              <button onClick={() => cambiarFecha(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-sm font-bold capitalize text-gray-800">
                {formatearFechaMostrar(fechaSeleccionada)}
              </h2>
              <button onClick={() => cambiarFecha(1)} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="max-w-5xl mx-auto px-4">
          <PlanAlerta />

          {vista === 'dia' && <AgendaDiaria fecha={fechaSeleccionada} />}

          {vista === 'semana' && (
            <div className="-mx-4 sm:mx-0">
              <AgendaSemanal 
                fechaInicio={fechaSeleccionada} 
                onSeleccionarDia={(f) => { setFechaSeleccionada(f); setVista('dia'); router.push(`/dashboard?fecha=${f}`); }} 
              />
            </div>
          )}

          {vista === 'mes' && (
            <div className="bg-white min-h-[500px]">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                datesSet={() => fetchDashboardData()}
                locale="es"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                events={eventos}
                height="auto"
                dateClick={(info) => {
                  setFechaSeleccionada(info.dateStr);
                  setVista('dia');
                  router.push(`/dashboard?fecha=${info.dateStr}`);
                }}
                eventContent={(info) => (
                  <div className="w-full flex justify-center items-center pt-1 pointer-events-none">
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

        {/* BOTONES FLOTANTES */}
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={() => router.push('/pacientes')}
            className="flex items-center gap-2 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <Users className="w-5 h-5" />
            <span className="font-bold text-sm">Pacientes</span>
          </button>
        </div>

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

// Exportamos envuelto en Suspense porque usamos useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
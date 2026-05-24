'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LayoutList, Grid3X3, Zap, ChevronLeft, ChevronRight, DollarSign, Users, User } from 'lucide-react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';
import PlanAlerta from '@/components/dashboard/PlanAlerta';
import AgendaDiaria from '@/app/components/dashboard/AgendaDiaria';
import { getFechaHoyLocal } from '@/app/utils/fechas';
import './calendar-styles.css';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fechaSeleccionada = searchParams.get('fecha') || getFechaHoyLocal();

  const [vista, setVista] = useState('dia');
  const [eventos, setEventos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [citasDia, setCitasDia] = useState([]);
  const [loadingCitas, setLoadingCitas] = useState(true);
  const cacheCitas = useRef({});

  // ESTADOS PARA EL FILTRADO DE DOCTORES (EXCLUSIVO ADMIN)
  const [doctores, setDoctores] = useState([]);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState('');

  // 1. CARGAR LISTA DE DOCTORES SI EL USUARIO ES ADMIN
  useEffect(() => {
    const cargarDoctoresAdmin = async () => {
      const isAdmin = localStorage.getItem('is_admin') === 'true';
      if (isAdmin) {
        try {
          const res = await authFetch(API_ENDPOINTS.ADMIN_RESUMEN_USUARIOS);
          if (res.ok) {
            const data = await res.json();
            setDoctores(data || []);
          }
        } catch (err) {
          console.error("Error cargando doctores para admin:", err);
        }
      }
    };
    cargarDoctoresAdmin();
  }, []);

  // 2. RE-CARGAR DATOS CUANDO CAMBIE LA FECHA, LA VISTA O EL DOCTOR SELECCIONADO
  useEffect(() => {
    if (cacheCitas.current[fechaSeleccionada + doctorSeleccionado]) {
      delete cacheCitas.current[fechaSeleccionada + doctorSeleccionado];
    }
    fetchDashboardData();
  }, [fechaSeleccionada, vista, doctorSeleccionado]);

  const fetchDashboardData = async (startDate = null, endDate = null) => {
    const esConsultaDia = !startDate && !endDate;
    const cacheKey = fechaSeleccionada + doctorSeleccionado;

    if (esConsultaDia && cacheCitas.current[cacheKey]) {
      setCitasDia(cacheCitas.current[cacheKey]);
    } else if (esConsultaDia) {
      setCitasDia([]);
    }

    if (!citasDia.length) {
      setLoadingCitas(true);
    }

    try {
      let queryParams = `?selected_date=${fechaSeleccionada}`;
      
      if (startDate && endDate) {
        queryParams += `&start=${startDate}&end=${endDate}`;
      }
      
      // Si el admin seleccionó un doctor, lo enviamos en la consulta
      if (doctorSeleccionado) {
        queryParams += `&doctor_id=${doctorSeleccionado}`;
      }

      const response = await authFetch(API_ENDPOINTS.DASHBOARD_HOME_DATA(queryParams));
      const data = await response.json();
      
      if (data.success) {
        setUsuario(data.usuario);
        
        if (data.eventos) {
          setEventos(data.eventos.map(e => ({
            ...e,
            title: `${e.title?.match(/\d+/)?.[0] || '0'}`
          })));
        }
        
        const nuevasCitas = data.citas_dia || [];
        setCitasDia(nuevasCitas);
        
        if (esConsultaDia) {
          cacheCitas.current[cacheKey] = nuevasCitas;
        }
      }
    } catch (err) {
      console.error('Error cargando Dashboard:', err);
    } finally {
      setLoadingCitas(false);
    }
  };

  const cambiarFecha = (offset) => {
    const [year, month, day] = fechaSeleccionada.split('-').map(Number);
    const fechaActual = new Date(year, month - 1, day);
    
    fechaActual.setDate(fechaActual.getDate() + offset);
    
    const nuevaFecha = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`;
    
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
        {/* Cabecera */}
        <div className="px-4 pt-6 pb-4 max-w-5xl mx-auto sm:pr-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-black leading-tight">
                Hola, {usuario?.nombre || 'Odontólogo'}!
              </h1>
              <p className="text-gray-500 text-sm font-medium">Panel Clínico</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* SELECTOR DE DOCTOR (SOLO VISIBLE PARA EL ADMINISTRADOR) */}
              {usuario?.is_admin && doctores.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm">
                  <User size={16} className="text-purple-600" />
                  <select
                    value={doctorSeleccionado}
                    onChange={(e) => setDoctorSeleccionado(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="">Mi Agenda (Admin)</option>
                    {doctores.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.nombre} ({doc.total_pacientes} pac)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector de Vistas */}
              <div className="flex bg-gray-200/60 p-1 rounded-xl backdrop-blur-sm">
                <button 
                  onClick={() => setVista('dia')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${vista === 'dia' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                >
                  <LayoutList size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-tight">Día</span>
                </button>
                <button 
                  onClick={() => setVista('mes')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${vista === 'mes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                >
                  <Grid3X3 size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-tight">Mes</span>
                </button>
              </div>
            </div>
          </div>

          {vista === 'dia' && (
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              <button onClick={() => cambiarFecha(-1)} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold capitalize text-gray-800">
                  {formatearFechaMostrar(fechaSeleccionada)}
                </h2>
                {fechaSeleccionada !== getFechaHoyLocal() && (
                  <button 
                    onClick={() => router.replace(`/dashboard?fecha=${getFechaHoyLocal()}`, { scroll: false })}
                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    Hoy
                  </button>
                )}
              </div>

              <button onClick={() => cambiarFecha(1)} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="max-w-5xl mx-auto px-4">
          <PlanAlerta />

          {vista === 'dia' && (
            <AgendaDiaria 
              fecha={fechaSeleccionada} 
              citasExternas={citasDia} 
              loading={loadingCitas} 
            />
          )}

          {vista === 'mes' && (
            <div className="bg-white min-h-[500px] rounded-3xl p-4 border border-gray-100 shadow-sm">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale="es"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                events={eventos}
                height="auto"
                initialDate={fechaSeleccionada}
                
                datesSet={(dateInfo) => {
                  fetchDashboardData(dateInfo.startStr.split('T')[0], dateInfo.endStr.split('T')[0]);
                }}

                dateClick={(info) => {
                  router.push(`/dashboard?fecha=${info.dateStr}`);
                  setVista('dia');
                }}
                
                eventContent={(info) => (
                  <div className="w-full flex justify-center items-center pt-1 pointer-events-none">
                    <div className="flex items-center gap-1 bg-gray-100 border-2 border-gray-200 px-3 py-0.3 rounded-full">
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

        {/* Botones Flotantes */}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
// app/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';
import './calendar-styles.css';
import { Zap, DollarSign, User } from 'lucide-react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';

export default function Home() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState([]);

  const dashboardCache = useRef(null);

  const transformarEventos = (eventosRaw) => {
    if (!eventosRaw || !Array.isArray(eventosRaw)) return [];
    return eventosRaw.map(evento => {
      const numero = evento.title?.match(/\d+/)?.[0] || '0';
      return {
        ...evento,
        title: `${numero}`
      };
    });
  };

  const precargarCitasHoy = async () => {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    
    try {
      // USAMOS EL ENDPOINT CENTRAL
      const response = await authFetch(API_ENDPOINTS.CITAS_POR_FECHA(fechaHoy));
      
      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem(`citas_${fechaHoy}`, JSON.stringify(data.citas || []));
      }
    } catch (err) {
      console.error('Error precargando citas:', err);
    }
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      if (dashboardCache.current) {
        const cached = dashboardCache.current;
        setDashboardData(cached.dashboardData);
        setEventos(transformarEventos(cached.eventos));
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // USAMOS EL ENDPOINT CENTRAL
        const response = await authFetch(API_ENDPOINTS.DASHBOARD_HOME_DATA);
        const data = await response.json();
        
        if (data.success) {
          const dashboardDataFormatted = {
            success: true,
            usuario: data.usuario,
            fecha_actual_formateada: data.fecha_actual_formateada,
            total_pacientes: data.total_pacientes
          };
          
          dashboardCache.current = {
            dashboardData: dashboardDataFormatted,
            eventos: data.eventos || []
          };
          
          setDashboardData(dashboardDataFormatted);
          setEventos(transformarEventos(data.eventos || []));
          precargarCitasHoy();
        }
      } catch (err) {
        console.error('Error cargando Dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);

  const handleDayCellDidMount = (info) => {
    const fechaReal = info.date.toISOString().split('T')[0];
    info.el.style.cursor = 'pointer';
    info.el.addEventListener('click', (e) => {
      e.stopPropagation();
      router.push(`/calendario/dia?fecha=${fechaReal}`);
    });
    
    if (fechaReal === new Date().toISOString().split('T')[0]) {
      info.el.style.backgroundColor = 'transparent';
    }
  };
    
  // PROTECCIÓN: Mientras carga o si los datos no han llegado
  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Cargando aplicación dental...</div>
      </div>
    );
  }

  const fechaActual = dashboardData?.fecha_actual_formateada || "Cargando fecha...";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 pt-4 pb-2 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-black">
            Hola, {dashboardData?.usuario?.nombre || 'Doctor'}!
          </h1>
          <p className="text-gray-500 text-sm">Hoy es {fechaActual}</p>
        </div>

        <div className="bg-white -mx-4 sm:mx-auto sm:max-w-5xl sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="es"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            buttonText={{ today: 'Hoy' }}
            events={eventos}
            height="auto"
            dayCellDidMount={handleDayCellDidMount}
            eventContent={(eventInfo) => {
              const tituloOriginal = eventInfo.event.title || '0';
              const numero = tituloOriginal.match(/\d+/)?.[0] || '0';
              
              return (
                // Aplicamos el color al div padre para que tanto el icono como el número sean morados
                <div className="flex items-center gap-1" style={{ color: '#dc22ed' }}>
                  <User size={18} /> 
                  <span className="font-bold">{numero}</span>
                </div>
              );
            }}
          />
        </div>

        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => router.push('/pagos/nuevo?rapido=1')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            <span className="font-bold text-sm sm:text-base">Cobro Rápido</span>
            <DollarSign className="w-5 h-5" />
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
// app/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';
import './calendar-styles.css';
import { Zap, DollarSign } from 'lucide-react';
import { API_BASE_URL, authFetch, getAuthToken } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';

export default function Home() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState([]);

  // Caché para los datos del dashboard
  const dashboardCache = useRef(null);

  // Precargar citas del día actual
  const precargarCitasHoy = async () => {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    try {
      console.log(`Precargando citas para: ${fechaHoy}`);
      const response = await authFetch(`${API_BASE_URL}/api/citas/por-fecha?fecha=${fechaHoy}`);
      
      if (response.ok) {
        const data = await response.json();
        // Guardar en sessionStorage para que lo lea VistaDiaria
        sessionStorage.setItem(`citas_${fechaHoy}`, JSON.stringify(data.citas || []));
        console.log(`Citas del día actual precargadas en sessionStorage`);
      }
    } catch (err) {
      console.error('Error precargando citas:', err);
    }
  };

  // Cargar todos los datos de la página principal (stats + eventos)
  useEffect(() => {
    const fetchHomeData = async () => {
      // Verificar si ya tenemos datos en caché
      if (dashboardCache.current) {
        console.log('Cargando dashboard desde caché');
        const cached = dashboardCache.current;
        setDashboardData(cached.dashboardData);
        setEventos(cached.eventos);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        const response = await authFetch(`${API_BASE_URL}/api/dashboard/home-data`);
        const data = await response.json();
        
        if (data.success) {
          const dashboardDataFormatted = {
            success: true,
            usuario: data.usuario,
            fecha_actual_formateada: data.fecha_actual_formateada,
            total_pacientes: data.total_pacientes
          };
          
          // Guardar en caché
          dashboardCache.current = {
            dashboardData: dashboardDataFormatted,
            eventos: data.eventos || []
          };
          console.log('Dashboard guardado en caché');
          
          setDashboardData(dashboardDataFormatted);
          setEventos(data.eventos || []);
          precargarCitasHoy();
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);

  // Al hacer clic en un día → redirigir a vista diaria
  const handleDateClick = (info) => {
    const fecha = info.dateStr;
    router.push(`/calendario/dia?fecha=${fecha}`);
  };

  const handleDayCellDidMount = (info) => {
    const hoy = new Date();
    
    // Obtener la fecha correcta
    const fechaObj = info.date;
    const año = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const fechaReal = `${año}-${mes}-${dia}`;
    
    // Hacer toda la celda clickeable
    info.el.style.cursor = 'pointer';
    info.el.addEventListener('click', (e) => {
      e.stopPropagation();
      router.push(`/calendario/dia?fecha=${fechaReal}`);
    });
    
    // Quitar fondo amarillo del día actual
    if (fechaReal === hoy.toISOString().split('T')[0]) {
      info.el.style.backgroundColor = 'transparent';
    }
  };
    
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      </div>
    );
  }

  const fechaActual = dashboardData?.fecha_actual_formateada || new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header - centrado en PC, normal en móvil */}
        <div className="px-4 pt-4 pb-2 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-black">
            Hola, {dashboardData?.usuario?.nombre || 'Usuario'}!
          </h1>
          <p className="text-gray-500 text-sm">Hoy es {fechaActual}</p>
        </div>

        {/* Calendario - ocupa todo el ancho en móvil, centrado en PC */}
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
            buttonText={{
              today: 'Hoy'
            }}
            events={eventos}
            height="auto"
            contentHeight="auto"
            aspectRatio={0.8}
            dayMaxEvents={false}
            dayCellDidMount={handleDayCellDidMount}
          />
        </div>

        {/* Botón flotante de Cobro Rápido */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => router.push('/pagos/nuevo?rapido=1')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
            title="Cobro Rápido"
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
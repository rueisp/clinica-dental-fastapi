'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Pencil, Phone, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import { API_BASE_URL, authFetch } from '@/config/api';

export default function VistaDiaria() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fechaParam = searchParams.get('fecha');
  
  const [fecha, setFecha] = useState(null);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Caché de citas por fecha
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
  
  const formatearFechaCompleta = (fechaStr) => {
    if (!fechaStr) return '';
    const [año, mes, dia] = fechaStr.split('-');
    const fecha = new Date(año, mes - 1, dia);
    return fecha.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  const cargarCitas = async (fechaStr, intento = 1) => {
    // 1. Revisar sessionStorage (precarga)
    const precargadas = sessionStorage.getItem(`citas_${fechaStr}`);
    if (precargadas) {
      console.log(`Usando precarga para: ${fechaStr}`);
      const citasPrecargadas = JSON.parse(precargadas);
      citasCache.current[fechaStr] = citasPrecargadas;
      setCitas(citasPrecargadas);
      setLoading(false);
      // Limpiar sessionStorage después de usarlo
      sessionStorage.removeItem(`citas_${fechaStr}`);
      return;
    }
    
    // 2. Revisar caché normal (si ya se visitó antes)
    if (citasCache.current[fechaStr]) {
      console.log(`Cargando desde caché: ${fechaStr}`);
      setCitas(citasCache.current[fechaStr]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Usar authFetch en lugar de fetch manual
      const response = await authFetch(`${API_BASE_URL}/api/citas/por-fecha?fecha=${fechaStr}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const citasData = data.citas || [];
        
        // Guardar en caché
        citasCache.current[fechaStr] = citasData;
        console.log(`Guardado en caché: ${fechaStr} (${citasData.length} citas)`);
        
        setCitas(citasData);
      } else if (response.status === 401) {
        // authFetch ya maneja la redirección a login
        setCitas([]);
      } else if (response.status === 404) {
        setCitas([]);
      } else {
        console.error(`Error ${response.status}:`, await response.text());
        setCitas([]);
        if (intento === 1) {
          alert('Error al cargar las citas. Intenta de nuevo.');
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        if (intento <= 2) {
          console.log(`Reintentando (${intento}/2)...`);
          setTimeout(() => cargarCitas(fechaStr, intento + 1), 1000);
          return;
        } else {
          alert('La conexión está tardando demasiado. Verifica tu conexión a internet.');
        }
      } else if (err.message.includes('Failed to fetch')) {
        if (intento <= 2) {
          console.log(`Reintentando por error de red (${intento}/2)...`);
          setTimeout(() => cargarCitas(fechaStr, intento + 1), 2000);
          return;
        } else {
          alert('No se puede conectar al servidor. Verifica que el backend esté corriendo.');
        }
      } else {
        console.error('Error inesperado:', err);
        alert('Ocurrió un error inesperado al cargar las citas.');
      }
      
      setCitas([]);
    } finally {
      if (intento === 1 || !controller.signal.aborted) {
        setTimeout(() => setLoading(false), 100);
      }
    }
  };
  
  const cambiarDia = (diasOffset) => {
    if (!fecha) return;
    const [año, mes, dia] = fecha.split('-');
    const fechaObj = new Date(año, mes - 1, dia);
    fechaObj.setDate(fechaObj.getDate() + diasOffset);
    
    const nuevaFechaStr = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
    router.push(`/calendario/dia?fecha=${nuevaFechaStr}`);
  };
  
  const volverCalendario = () => {
    router.push('/');
  };
  
  const nuevaCitaEnHora = (hora) => {
    router.push(`/citas/nueva?fecha=${fecha}&hora=${hora}`);
  };
  
  const editarCita = (citaId) => {
    router.push(`/citas/editar/${citaId}`);
  };

  const enviarWhatsApp = (telefono, nombre, hora) => {
    if (!telefono) {
        alert('No hay número de teléfono registrado');
        return;
    }
    const mensaje = `Hola ${nombre}, te recordamos tu cita a las ${hora}.`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };
  
  useEffect(() => {
    if (fechaParam) {
      setFecha(fechaParam);
      cargarCitas(fechaParam);
    }
  }, [fechaParam]);
  
  const getCitaEnHora = (hora) => {
    return citas.find(c => c.hora === hora);
  };
  
  if (!fecha) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>;
  }
  
  return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-0 sm:px-4"> 
          
        
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button 
                icon="ChevronLeft" 
                soloIcono={true} 
                size="sm"
                variant="ghost" 
                onClick={() => cambiarDia(-1)} 
                className="rounded-full"
              />
              <h1 className="text-2xl font-bold text-gray-900 text-center">{formatearFechaCompleta(fecha)}</h1>
              <Button 
                icon="ChevronRight" 
                soloIcono={true} 
                size="sm"
                variant="ghost" 
                onClick={() => cambiarDia(1)} 
                className="rounded-full"
              />
            </div>
              <Button 
                texto="Inicio" 
                variant="secondary" 
                onClick={volverCalendario} 
              />
            </div>
        
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center px-4 py-3 bg-gray-50 border-b">
            <div className="w-20 text-xs font-semibold text-gray-500">Hora</div>
            <div className="flex-1 text-xs font-semibold text-gray-500">Paciente</div>
            <div className="w-20 text-right text-xs font-semibold text-gray-500">Acciones</div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {horarios.map((hora) => {
              const cita = getCitaEnHora(hora);
              const tieneCita = !!cita;
              return (
                <div key={hora} className="flex items-center py-3 hover:bg-gray-50">
                {/* Hora - más grande */}
                <div className="w-14 text-base font-medium text-gray-900 pl-1">{hora}</div>
                
                <div className="flex-1">
                  {tieneCita ? (
                    <div className="flex items-center gap-1.5">
                      {/* Indicador verde */}
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                      
                      {/* Nombre del paciente - más grande */}
                      <button 
                        onClick={() => {
                          if (cita.paciente_id) {
                            router.push(`/pacientes/${cita.paciente_id}`);  // ← cambiado
                          }
                        }}  
                        className={`text-base font-medium truncate max-w-[180px] sm:max-w-none ${cita.paciente_id ? 'text-blue-600 hover:underline' : 'text-gray-900 cursor-default'}`}
                      >
                        {cita.paciente_nombre}
                      </button>
                      
                      {/* Motivo - más grande */}
                      {cita.motivo && (
                        <span className="text-sm text-gray-400 flex-shrink-0">({cita.motivo})</span>
                      )}
                      
                      {/* Grupo de íconos */}
                      <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 pr-1">
                        {cita.telefono && (
                          <button 
                            onClick={() => enviarWhatsApp(cita.telefono, cita.paciente_nombre, cita.hora)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="WhatsApp"
                          >
                            <Phone className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => editarCita(cita.id)} 
                          className="text-gray-400 hover:text-black p-1"
                          title="Editar cita"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => nuevaCitaEnHora(hora)} className="text-gray-400 hover:text-gray-600 text-sm">
                      + Agendar cita
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
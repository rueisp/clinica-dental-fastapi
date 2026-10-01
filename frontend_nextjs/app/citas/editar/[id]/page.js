'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import { API_BASE_URL, authFetch } from '@/config/api';
import { useUser } from '@/context/UserContext';

export default function EditarCita() {
  const params = useParams();
  const router = useRouter();
  const citaId = params.id;
  // Ubicación: frontend_nextjs/app/citas/editar/[id]/page.js (dentro de EditarCita, justo debajo de const citaId = params.id;)
  const { user, loading: userLoading } = useUser();
  const planVencido = !user?.is_admin && (
    !user?.plan_info || 
    user?.plan_info?.status !== 'active' || 
    user?.plan_info?.dias_restantes <= 0
  );

  useEffect(() => {
    if (!userLoading && planVencido) {
      alert('⚠️ Tu plan ha expirado. Por favor, renueva tu suscripción para gestionar y editar citas.');
      router.push('/planes');
    }
  }, [planVencido, userLoading, router]);
  
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    paciente_id: null,
    paciente_nombre: '',
    paciente_telefono: '',
    motivo: '',
    doctor: ''
  });

  const handleRegistrarPaciente = () => {
    const nombreCompleto = (formData.paciente_nombre || '').trim();
    const partes = nombreCompleto.split(/\s+/).filter(Boolean);
    let nombres = '';
    let apellidos = '';

    // Lista de segundos nombres más comunes en Colombia
    const segundosNombresComunes = new Set([
      'jose', 'maria', 'carlos', 'luis', 'andres', 'david', 'fernando',
      'alberto', 'antonio', 'manuel', 'guillermo', 'eduardo', 'alejandro',
      'daniel', 'felipe', 'alexander', 'javier', 'miguel', 'gabriel',
      'camila', 'sofia', 'paula', 'andrea', 'alejandra', 'carolina',
      'patricia', 'isabel', 'elena', 'lucia', 'victoria', 'cristina',
      'marina', 'teresa', 'esperanza', 'rocio', 'ines', 'pablo', 'enrique'
    ]);

    const limpiar = (txt) => (txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (partes.length <= 1) {
      nombres = partes[0] || '';
    } else if (partes.length === 2) {
      nombres = partes[0];
      apellidos = partes[1];
    } else if (partes.length === 3) {
      const segundaPalabraLimpia = limpiar(partes[1]);
      
      // Si la 2da palabra es un segundo nombre (ej: María José Gómez, Juan Carlos Pérez)
      if (segundosNombresComunes.has(segundaPalabraLimpia)) {
        nombres = `${partes[0]} ${partes[1]}`;
        apellidos = partes[2];
      } else {
        // Si la 2da palabra es un apellido (ej: María Pérez Gómez)
        nombres = partes[0];
        apellidos = `${partes[1]} ${partes[2]}`;
      }
    } else {
      // 4 o más palabras (ej: María José Pérez Gómez)
      nombres = partes.slice(0, 2).join(' ');
      apellidos = partes.slice(2).join(' ');
    }
    
    const query = new URLSearchParams({
      nombres,
      apellidos,
      telefono: formData.paciente_telefono || '',
      cita_id: citaId
    }).toString();

    router.push(`/pacientes/nuevo?${query}`);
  };
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);

  let timeoutId;

  // Buscar pacientes
  const buscarPacientes = async (termino) => {
    if (termino.length < 3) return;
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes/?search=${termino}`);
      const data = await response.json();
      setPacientes(data.pacientes || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const timeoutRef = useRef(null);

  // Debounce para búsqueda
  const buscarPacientesDebounced = (termino) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (termino.length >= 3) {
        buscarPacientes(termino);
      } else {
        setPacientes([]);
        setMostrarResultados(false);
      }
    }, 300);
  };
  
  // Cargar datos de la cita
  useEffect(() => {
    const cargarCita = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/citas/${citaId}`);
        const data = await response.json();
        if (response.ok) {
          setFormData({
            fecha: data.fecha || '',
            hora: data.hora || '',
            paciente_id: data.paciente_id || null,
            paciente_nombre: data.paciente_nombre || '',
            paciente_telefono: data.telefono || '',
            motivo: data.motivo || '',
            doctor: data.doctor || ''
          });
        } else {
          alert('Error al cargar la cita');
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Error de conexión');
      } finally {
        setLoading(false);
      }
    };
    
    if (citaId) {
      cargarCita();
    }
  }, [citaId, router]);
  
  const seleccionarPaciente = (paciente) => {
    setFormData({
      ...formData,
      paciente_id: paciente.id,
      paciente_nombre: `${paciente.nombres} ${paciente.apellidos}`,
      paciente_telefono: paciente.telefono
    });
    setBuscarPaciente('');
    setMostrarResultados(false);
  };
  
  // Ubicación: frontend_nextjs/app/citas/editar/[id]/page.js (reemplazar la función handleSubmit)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (planVencido) {
      alert('⚠️ Tu plan ha expirado. Por favor, renueva tu suscripción para guardar cambios.');
      router.push('/planes');
      return;
    }

    if (formData.hora < "08:00" || formData.hora > "20:30") {
      alert("❌ El horario de atención permitido es de 08:00 AM a 08:30 PM. Por favor, verifica la hora seleccionada (asegúrate de haber elegido PM si es por la tarde).");
      return;
    }

    setSaving(true);
    
    try {
      const response = await authFetch(`${API_BASE_URL}/api/citas/${citaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          fecha: formData.fecha,
          hora: formData.hora,
          paciente_id: formData.paciente_id,
          paciente_nombre: formData.paciente_nombre,
          paciente_telefono: formData.paciente_telefono,
          motivo: formData.motivo,
          doctor: formData.doctor
        })
      });
      
      if (response.ok) {
        router.replace(`/dashboard?fecha=${formData.fecha}`);
      } else {
        const error = await response.json();
        alert('Error: ' + (error.detail || 'No se pudo actualizar la cita'));
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };
  
  // Ubicación: frontend_nextjs/app/citas/editar/[id]/page.js (reemplazar la función eliminarCita)
  const eliminarCita = async () => {
    if (planVencido) {
      alert('⚠️ Tu plan ha expirado. Por favor, renueva tu suscripción para realizar cambios en tus citas.');
      router.push('/planes');
      return;
    }

    if (!confirm('¿Eliminar esta cita?')) return;
    
    try {
      const response = await authFetch(`${API_BASE_URL}/api/citas/${citaId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        router.push(`/dashboard?fecha=${formData.fecha}`);
      } else {
        alert('Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Cargando cita...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-black mb-6">Editar Cita</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({...formData, hora: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Paciente</label>
              <input
                type="text"
                value={buscarPaciente}
                onChange={(e) => {
                  const valor = e.target.value;
                  setBuscarPaciente(valor);
                  buscarPacientesDebounced(valor);
                  setMostrarResultados(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Escribe al menos 3 caracteres (nombre o teléfono)"
              />
              <p className="text-xs text-gray-400 mt-1">Ej: "juan" o "300"</p>
              
              {mostrarResultados && (
                <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                  {pacientes.length > 0 ? (
                    pacientes.map(paciente => (
                      <button
                        key={paciente.id}
                        type="button"
                        onClick={() => {
                          seleccionarPaciente(paciente);
                          setMostrarResultados(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b"
                      >
                        <div className="font-medium">{paciente.nombres} {paciente.apellidos}</div>
                        <div className="text-xs text-gray-500">{paciente.telefono}</div>
                      </button>
                    ))
                  ) : (
                    buscarPaciente.length >= 3 && (
                      <div className="px-3 py-2 text-gray-400 text-sm">No se encontraron pacientes</div>
                    )
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Paciente</label>
              <input
                type="text"
                value={formData.paciente_nombre}
                onChange={(e) => setFormData({...formData, paciente_nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.paciente_telefono}
                onChange={(e) => setFormData({...formData, paciente_telefono: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input
                type="text"
                value={formData.motivo}
                onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej: Limpieza, Consulta, Urgencia"
              />
            </div>

            {!formData.paciente_id && (
              <Button
                texto="Registrar como Paciente Nuevo"
                variant="blue" // <-- Cambiado a la nueva variante nativa
                onClick={handleRegistrarPaciente}
                className="w-full mb-4 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
              />
            )}
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                texto={saving ? 'Guardando...' : 'Guardar Cambios'} 
                variant="primary" 
                disabled={saving}
                className="flex-1"
              />
              <Button 
                texto="Eliminar" 
                variant="danger" 
                onClick={eliminarCita}
                className="flex-1"
              />
              <Button 
                texto="Cancelar" 
                variant="secondary" 
                onClick={() => router.replace(`/dashboard?fecha=${formData.fecha}`)}
                className="flex-1"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
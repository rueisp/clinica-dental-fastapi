'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import { API_BASE_URL, authFetch } from '@/config/api';

export default function EditarCita() {
  const params = useParams();
  const router = useRouter();
  const citaId = params.id;
  
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    paciente_id: null,
    paciente_nombre: '',
    paciente_telefono: '',
    motivo: '',
    doctor: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);

  let timeoutId;

  // Buscar pacientes
  const buscarPacientes = async (termino) => {
    if (termino.length < 2) return;
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes?search=${termino}`);
      const data = await response.json();
      setPacientes(data.pacientes || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Debounce para búsqueda
  const buscarPacientesDebounced = (termino) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (termino.length >= 2) {
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
          router.push('/');
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
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
        router.push(`/calendario/dia?fecha=${formData.fecha}`);
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
  
  const eliminarCita = async () => {
    if (!confirm('¿Eliminar esta cita?')) return;
    
    try {
      const response = await authFetch(`${API_BASE_URL}/api/citas/${citaId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        router.push(`/calendario/dia?fecha=${formData.fecha}`);
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
                onClick={() => router.push(`/calendario/dia?fecha=${formData.fecha}`)}
                className="flex-1"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
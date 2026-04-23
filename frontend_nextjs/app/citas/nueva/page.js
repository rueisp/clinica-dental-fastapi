'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import { API_BASE_URL, authFetch } from '@/config/api';

export default function NuevaCita() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const fechaParam = searchParams.get('fecha');
  const horaParam = searchParams.get('hora');
  
  const [formData, setFormData] = useState({
    fecha: fechaParam || '',
    hora: horaParam || '',
    paciente_id: null,
    paciente_nombre: '',
    paciente_telefono: '',
    motivo: '',
    doctor: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  
  // Función que busca en la API
  const buscarPacientesAPI = async (termino) => {
    if (termino.length < 2) return;
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes?search=${termino}`);
      const data = await response.json();
      setPacientes(data.pacientes || []);
      setMostrarResultados(true);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  // Función con debounce
  let timeoutId;
  const buscarPacientesDebounced = (termino) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (termino.length >= 2) {
        buscarPacientesAPI(termino);
      } else {
        setPacientes([]);
        setMostrarResultados(false);
      }
    }, 300);
  };
  
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
    setLoading(true);
    
    try {
      const response = await authFetch(`${API_BASE_URL}/api/citas`, {
        method: 'POST',
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
        alert('Error: ' + (error.detail || 'No se pudo crear la cita'));
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-black mb-6">Nueva Cita</h1>
          
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
                  setBuscarPaciente(e.target.value);
                  buscarPacientesDebounced(e.target.value);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setMostrarResultados(false);
                  }, 200);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Escribe nombre o teléfono"
              />
              {mostrarResultados && pacientes.length > 0 && (
                <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                  {pacientes.map(paciente => (
                    <button
                      key={paciente.id}
                      type="button"
                      onClick={() => seleccionarPaciente(paciente)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b"
                    >
                      <div className="font-medium">{paciente.nombres} {paciente.apellidos}</div>
                      <div className="text-xs text-gray-500">{paciente.telefono}</div>
                    </button>
                  ))}
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
                texto={loading ? 'Guardando...' : 'Guardar Cita'} 
                variant="primary" 
                disabled={loading}
                className="flex-1"
              />
              <Button 
                texto="Cancelar" 
                variant="secondary" 
                onClick={() => router.back()}
                className="flex-1"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
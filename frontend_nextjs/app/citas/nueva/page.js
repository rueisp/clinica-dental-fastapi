'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Home, Calendar, User, Phone, MessageSquare, Search } from 'lucide-react'; // Importamos iconos para el diseño
import Link from 'next/link';
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

  // 1. LÓGICA DE BÚSQUEDA AUTOMÁTICA (DEBOUNCE)
  useEffect(() => {
    if (buscarPaciente.length >= 3) {
      const delayDebounceFn = setTimeout(() => {
        buscarPacientesAPI(buscarPaciente);
      }, 400);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setPacientes([]);
      setMostrarResultados(false);
    }
  }, [buscarPaciente]);

  const buscarPacientesAPI = async (termino) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes?search=${termino}`);
      const data = await response.json();
      setPacientes(data.pacientes || []);
      setMostrarResultados(true);
    } catch (err) {
      console.error('Error buscando pacientes:', err);
    }
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
        body: JSON.stringify(formData)
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
    <div className="max-w-3xl mx-auto px-4 py-8 text-black">
      {/* Cabecera Estilo Pagos */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Nueva Cita</h1>
          <p className="text-gray-400 font-medium">Agendar cita médica</p>
        </div>
        <Link href="/">
          <button className="bg-gray-100 text-gray-600 p-3 rounded-2xl hover:bg-gray-200 transition-all">
            <Home className="w-6 h-6" />
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BUSCADOR DE PACIENTES - DISEÑO MEJORADO */}
          <div className="relative">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Buscar Paciente Existente
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={buscarPaciente}
                onChange={(e) => setBuscarPaciente(e.target.value)}
                placeholder="Escribe nombre o documento..."
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all text-black font-medium"
              />
            </div>
            
            {/* Resultados flotantes estilo profesional */}
            {mostrarResultados && pacientes.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {pacientes.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => seleccionarPaciente(p)}
                    className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors group"
                  >
                    <div className="font-bold text-black group-hover:text-blue-600">{p.nombres} {p.apellidos}</div>
                    <div className="text-xs text-gray-400 font-medium">Doc: {p.documento || 'N/A'} • Tel: {p.telefono}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
            {/* Fecha */}
            <div>
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5 font-bold"
                required
              />
            </div>

            {/* Hora */}
            <div>
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                <span className="text-[10px]">⏰</span> Hora
              </label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({...formData, hora: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5 font-bold"
                required
              />
            </div>
          </div>

          {/* Datos del Paciente Seleccionado */}
          <div className="space-y-4 pt-4">
             <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  <User className="w-3.5 h-3.5" /> Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.paciente_nombre}
                  onChange={(e) => setFormData({...formData, paciente_nombre: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black/5 font-medium"
                  placeholder="Nombre del paciente"
                  required
                />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    <Phone className="w-3.5 h-3.5" /> Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.paciente_telefono}
                    onChange={(e) => setFormData({...formData, paciente_telefono: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Motivo / Procedimiento
                  </label>
                  <input
                    type="text"
                    value={formData.motivo}
                    onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black/5"
                    placeholder="Ej: Limpieza dental"
                  />
                </div>
             </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-4 pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg disabled:bg-gray-400"
            >
              {loading ? 'Agendando...' : 'Confirmar Cita'}
            </button>
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
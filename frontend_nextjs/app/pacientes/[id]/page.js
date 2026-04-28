'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import Dentigrama from '@/app/components/pacientes/Dentigrama';
import Evoluciones from '@/app/components/pacientes/Evoluciones';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { API_BASE_URL, authFetch } from '@/config/api';
// Importamos los iconos solicitados
import { ClipboardList, Activity } from 'lucide-react';

export default function MostrarPaciente() {
  const { id } = useParams();
  const router = useRouter();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/pacientes/${id}`);
        if (!response.ok) throw new Error('Paciente no encontrado');
        const data = await response.json();
        setPaciente(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPaciente();
  }, [id]);

  const handleEliminar = async () => {
    const confirmar = confirm('¿Estás seguro de mover este paciente a la papelera?');
    if (!confirmar) return;
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        alert('Paciente movido a la papelera');
        router.push('/pacientes');
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al eliminar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HeaderPaciente loading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. Indicador superior pequeño */}
      <div className="flex items-center gap-1.5 ml-5 mb-[-25px] relative z-10">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Paciente Activo
        </span>
      </div>

      {/* 2. Header: Sin el botón manual afuera para evitar duplicados */}
      <HeaderPaciente 
        paciente={paciente}
        modo="mostrar"
        onEliminar={handleEliminar}
      />
      
      <TarjetaInfoPaciente 
        paciente={paciente}
        modo="mostrar"
      />
      
      {/* 3. Evoluciones con Icono */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4 text-gray-800">
          <ClipboardList size={20} className="text-blue-500" />
          <h2 className="font-bold">Evoluciones Clínicas</h2>
        </div>
        <Evoluciones pacienteId={parseInt(id)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* 4. Dentigrama con Icono */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4 text-gray-800">
            <Activity size={20} className="text-purple-500" />
            <h2 className="font-bold">Odontograma Digital</h2>
          </div>
          <Dentigrama 
            dentigramaCanvas={paciente.dentigrama_canvas}
            modo="mostrar"
          />
        </div>

        <ImagenPerfil 
          imagenUrl={paciente.imagen_perfil_url}
          nombrePaciente={`${paciente.nombres} ${paciente.apellidos}`}
        />
      </div>
    </div>
  );
}
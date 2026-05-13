'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import Dentigrama from '@/app/components/pacientes/Dentigrama';
import Evoluciones from '@/app/components/pacientes/Evoluciones';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { API_BASE_URL, authFetch, API_ENDPOINTS } from '@/config/api';
import { ClipboardList, Activity, FileText } from 'lucide-react';

export default function MostrarPaciente() {
  const { id } = useParams();
  const router = useRouter();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- ESTO ES LO QUE ESTABA AFUERA Y AHORA ESTÁ ADENTRO (CORRECTO) ---
  const [canExport, setCanExport] = useState(true);

  useEffect(() => {
    const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}');
    const isAdmin = localStorage.getItem('is_admin') === 'true'; // Detectar admin

    if (isAdmin) {
      setCanExport(true); // El admin siempre puede exportar
    } else if (perms.can_export_history !== undefined) {
      setCanExport(perms.can_export_history);
    }
  }, []);
  // ------------------------------------------------------------------

  useEffect(() => {
    const fetchPaciente = async () => {
// ... el resto de tu código sigue igual
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

  const handleExportarWord = async () => {
    if (!canExport) return alert("La descarga de historia clínica en Word es exclusiva del Plan PRO");
    try {
      const response = await authFetch(API_ENDPOINTS.EXPORTAR_PACIENTE_WORD(id));
      if (!response.ok) throw new Error('Error al generar el documento');

      // Manejo de archivo binario (Blob)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Historia_${paciente.apellidos}.docx`);
      document.body.appendChild(link);
      link.click();
      
      // Limpieza
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('No se pudo descargar la historia clínica');
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
      
      {/* 3. Evoluciones con Icono y Botón de Exportar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-800">
            <ClipboardList size={20} className="text-blue-500" />
            <h2 className="font-bold">Evoluciones Clínicas</h2>
          </div>
          
          <button
            onClick={handleExportarWord}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              !canExport 
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed grayscale' 
              : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
            }`}
          >
            <FileText size={16} />
            {canExport ? 'EXPORTAR HISTORIA' : 'EXPORTAR (PRO) 🔒'}
          </button>
        </div>
        <Evoluciones pacienteId={id} />
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
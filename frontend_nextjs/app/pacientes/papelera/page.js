'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, RotateCcw, ArrowLeft, XCircle } from 'lucide-react';
import { API_BASE_URL, authFetch } from '@/config/api';

export default function Papelera() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar pacientes eliminados
  const cargarPapelera = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes/papelera`);
      
      if (response.ok) {
        const data = await response.json();
        setPacientes(data.pacientes || []);
      } else {
        console.error('Error al cargar papelera:', response.status);
        alert('Error al cargar la papelera');
      }
    } catch (err) {
      console.error(err);
      alert('Error al cargar la papelera');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPapelera();
  }, []);

  // Restaurar paciente
  const handleRestaurar = async (id) => {
    const confirmar = confirm('¿Restaurar este paciente?');
    if (!confirmar) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes/${id}/restaurar`, {
        method: 'PUT'
      });

      if (response.ok) {
        alert('Paciente restaurado');
        cargarPapelera();
      } else {
        alert('Error al restaurar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  // Eliminar definitivamente
  const handleEliminarDefinitivo = async (id) => {
    const confirmar = confirm('⚠️ ¿ELIMINAR DEFINITIVAMENTE? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes/${id}/permanente`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Paciente eliminado definitivamente');
        cargarPapelera();
      } else {
        alert('Error al eliminar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/pacientes">
            <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-black">Papelera</h1>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
            {pacientes.length}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : pacientes.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">La papelera está vacía</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs uppercase font-black">
              <tr>
                <th className="hidden sm:table-cell px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="hidden sm:table-cell px-6 py-4">Documento</th>
                <th className="px-6 py-4">Eliminado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pacientes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* ID Recortado y oculto en móvil */}
                  <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-400 font-bold">
                    #{p.id.substring(0, 8)}
                  </td>

                  {/* Nombre en dos líneas (Igual que en Pacientes) */}
                  <td className="px-6 py-3 font-bold text-black">
                    <div className="flex flex-col leading-tight">
                      <span className="truncate max-w-[120px] sm:max-w-none block">
                        {p.nombres}
                      </span>
                      <span className="truncate max-w-[120px] sm:max-w-none block text-gray-500">
                        {p.apellidos}
                      </span>
                    </div>
                  </td>

                  {/* Documento oculto en móvil para dar espacio a botones */}
                  <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-600">
                    {p.documento || '-'}
                  </td>

                  <td className="px-6 py-4 text-xs text-gray-500">
                    {p.deleted_at ? p.deleted_at.split(' ')[0] : '-'}
                  </td>

                  {/* Botones de acción */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleRestaurar(p.id)}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                        title="Restaurar"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => handleEliminarDefinitivo(p.id)}
                        className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                        title="Eliminar definitivamente"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

export default function Evoluciones({ pacienteId }) {
  const [evoluciones, setEvoluciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nuevaEvolucion, setNuevaEvolucion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState('');
  

  const cargarEvoluciones = async () => {
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pacientes/${pacienteId}/evoluciones`, {
        headers: { 'Authorization': 'Bearer test_token_123' }
      });
      const data = await response.json();
      if (response.ok) {
        setEvoluciones(data.evoluciones || []);
      }
    } catch (err) {
      console.error('Error cargando evoluciones:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (pacienteId) {
      cargarEvoluciones();
    }
  }, [pacienteId]);

  const agregarEvolucion = async () => {
    if (!nuevaEvolucion.trim()) {
      alert('La evolución no puede estar vacía');
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pacientes/${pacienteId}/evoluciones`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test_token_123',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion: nuevaEvolucion })
      });

      if (response.ok) {
        setNuevaEvolucion('');
        cargarEvoluciones();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.detail || 'No se pudo agregar'));
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (evolucion) => {
    setEditandoId(evolucion.id);
    setEditandoTexto(evolucion.descripcion);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoTexto('');
  };

  const guardarEdicion = async (evolucionId) => {
    if (!editandoTexto.trim()) {
      alert('La evolución no puede estar vacía');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/evoluciones/${evolucionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test_token_123',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion: editandoTexto })
      });

      if (response.ok) {
        setEditandoId(null);
        setEditandoTexto('');
        cargarEvoluciones();
      } else {
        alert('Error al actualizar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const eliminarEvolucion = async (evolucionId) => {
    if (!confirm('¿Eliminar esta evolución?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/evoluciones/${evolucionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test_token_123' }
      });

      if (response.ok) {
        cargarEvoluciones();
      } else {
        alert('Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
      <h2 className="text-xl font-bold text-black mb-4">Historial Clínico / Evoluciones</h2>

      {/* Formulario para agregar */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nueva Evolución
        </label>
        <textarea
          value={nuevaEvolucion}
          onChange={(e) => setNuevaEvolucion(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
          rows="3"
          placeholder="Escribe la evolución del paciente..."
        />
        <button
          onClick={agregarEvolucion}
          disabled={guardando}
          className="mt-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Agregar Evolución'}
        </button>
      </div>

      {/* Lista de evoluciones */}
      {cargando ? (
        <div className="text-center py-4 text-gray-400">Cargando evoluciones...</div>
      ) : evoluciones.length === 0 ? (
        <div className="text-center py-4 text-gray-400">No hay evoluciones registradas</div>
      ) : (
        <div className="space-y-3">
          {evoluciones.map((evolucion) => (
            <div key={evolucion.id} className="border border-gray-200 rounded-lg p-4">
              {editandoId === evolucion.id ? (
                <>
                  <textarea
                    value={editandoTexto}
                    onChange={(e) => setEditandoTexto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                    rows="3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => guardarEdicion(evolucion.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400">
                      {new Date(evolucion.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => iniciarEdicion(evolucion)}
                        className="text-gray-400 hover:text-black text-sm"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => eliminarEvolucion(evolucion.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{evolucion.descripcion}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
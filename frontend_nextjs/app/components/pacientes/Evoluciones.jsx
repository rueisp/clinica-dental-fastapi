'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Mic, MicOff, Save, X } from 'lucide-react';
import { API_ENDPOINTS, authFetch } from '@/config/api';

export default function Evoluciones({ pacienteId }) {
  const [evoluciones, setEvoluciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nuevaEvolucion, setNuevaEvolucion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState('');
  
  // Estados para el dictado por voz
  const [estaEscuchando, setEstaEscuchando] = useState(false);
  const recognitionRef = useRef(null);

  // --- DICCIONARIO ODONTOLÓGICO Y LIMPIEZA ---
  const correccionesOdonto = {
    "Marco benítez": "Arco de Niti",
    "piesa": "pieza",
    "oclucion": "oclusión",
    "endodoncia": "endodoncia",
    "periodontitis": "periodontitis",
    "carie": "caries",
    "odontograma": "odontograma",
    "gingivitis": "gingivitis"
  };

  const procesarTextoDictado = (texto) => {
    let palabras = texto.toLowerCase().split(" ");
    const palabrasCorregidas = palabras.map(palabra => correccionesOdonto[palabra] || palabra);
    let resultado = palabrasCorregidas.join(" ");
    // Capitalizar la primera letra
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
  };

  // --- CONFIGURACIÓN DE SPEECH RECOGNITION ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Se detiene al dejar de hablar
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const textoLimpio = procesarTextoDictado(transcript);
        
        // Si estamos editando uno existente o creando uno nuevo
        if (editandoId) {
          setEditandoTexto(prev => prev + (prev ? ' ' : '') + textoLimpio);
        } else {
          setNuevaEvolucion(prev => prev + (prev ? ' ' : '') + textoLimpio);
        }
        setEstaEscuchando(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error en reconocimiento:", event.error);
        setEstaEscuchando(false);
      };

      recognitionRef.current.onend = () => setEstaEscuchando(false);
    }
  }, [editandoId]);

  const toggleEscuchar = () => {
    if (estaEscuchando) {
      recognitionRef.current?.stop();
      setEstaEscuchando(false);
    } else {
      try {
        recognitionRef.current?.start();
        setEstaEscuchando(true);
      } catch (e) {
        console.error("No se pudo iniciar el dictado", e);
      }
    }
  };

  // --- LÓGICA DE API (Usando authFetch) ---
  const cargarEvoluciones = async () => {
    setCargando(true);
    try {
      const response = await authFetch(API_ENDPOINTS.EVOLUCIONES_BY_PACIENTE(pacienteId));
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
    if (pacienteId) cargarEvoluciones();
  }, [pacienteId]);

  const agregarEvolucion = async () => {
    if (!nuevaEvolucion.trim()) return alert('La evolución no puede estar vacía');

    setGuardando(true);
    try {
      const response = await authFetch(API_ENDPOINTS.PACIENTE_BY_ID(pacienteId) + '/evoluciones', {
        method: 'POST',
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

  const guardarEdicion = async (evolucionId) => {
    if (!editandoTexto.trim()) return alert('El texto no puede estar vacío');

    try {
      const response = await authFetch(`${API_ENDPOINTS.NUEVA_EVOLUCION}/${evolucionId}`, {
        method: 'PUT',
        body: JSON.stringify({ descripcion: editandoTexto })
      });

      if (response.ok) {
        setEditandoId(null);
        cargarEvoluciones();
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const eliminarEvolucion = async (evolucionId) => {
    if (!confirm('¿Eliminar esta evolución?')) return;
    try {
      const response = await authFetch(`${API_ENDPOINTS.NUEVA_EVOLUCION}/${evolucionId}`, { method: 'DELETE' });
      if (response.ok) cargarEvoluciones();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        Historial Clínico / Evoluciones
      </h2>

      {/* Formulario de Nueva Evolución */}
      <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Nueva Entrada
          </label>
          
          {/* BOTÓN DE VOZ */}
          <button
            onClick={toggleEscuchar}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              estaEscuchando 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {estaEscuchando ? <MicOff size={14} /> : <Mic size={14} />}
            {estaEscuchando ? 'ESCUCHANDO...' : 'DICTAR POR VOZ'}
          </button>
        </div>

        <textarea
          value={nuevaEvolucion}
          onChange={(e) => setNuevaEvolucion(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none resize-none"
          rows="3"
          placeholder={estaEscuchando ? "Hable ahora..." : "Escribe o dicta la evolución del paciente..."}
        />
        
        <button
          onClick={agregarEvolucion}
          disabled={guardando || estaEscuchando}
          className="mt-3 w-full sm:w-auto px-6 py-2.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {guardando ? 'Guardando...' : 'Guardar Evolución'}
        </button>
      </div>

      {/* Lista de Evoluciones */}
      {cargando ? (
        <div className="text-center py-10 text-gray-400 animate-pulse">Cargando historial...</div>
      ) : evoluciones.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
          No hay evoluciones registradas para este paciente.
        </div>
      ) : (
        <div className="space-y-4">
          {evoluciones.map((evolucion) => (
            <div key={evolucion.id} className="group border border-gray-100 bg-white rounded-xl p-4 hover:shadow-md transition-all border-l-4 border-l-blue-500">
              {editandoId === evolucion.id ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 uppercase">Editando entrada</span>
                    <button 
                      onClick={toggleEscuchar}
                      className={`p-2 rounded-full ${estaEscuchando ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      <Mic size={16} />
                    </button>
                  </div>
                  <textarea
                    value={editandoTexto}
                    onChange={(e) => setEditandoTexto(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="4"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => guardarEdicion(evolucion.id)} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                      <Save size={16} /> Aplicar Cambios
                    </button>
                    <button onClick={() => setEditandoId(null)} className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300">
                      <X size={16} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Fecha de Registro</span>
                      <span className="text-xs font-bold text-gray-500">
                        {new Date(evolucion.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditandoId(evolucion.id); setEditandoTexto(evolucion.descripcion); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => eliminarEvolucion(evolucion.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm border-t border-gray-50 pt-2">
                    {evolucion.descripcion}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
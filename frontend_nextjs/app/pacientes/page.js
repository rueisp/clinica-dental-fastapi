'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Home } from 'lucide-react';
import { API_BASE_URL, authFetch } from '@/config/api';

export default function ListaPacientes() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [haBuscado, setHaBuscado] = useState(false);
  const porPagina = 5;

// 1. Carga inicial: Se ejecuta solo una vez al entrar a la página
  useEffect(() => {
    cargarUltimosPacientes();
  }, []);

  // 2. Búsqueda automática: Se ejecuta cada vez que cambia el texto en "buscar"
  useEffect(() => {
    // Definimos un temporizador para no saturar al servidor (Debounce)
    const delayDebounceFn = setTimeout(() => {
      
      if (buscar.length >= 3) {
        // Si hay 3 o más letras, buscamos
        handleBuscar();
      } else if (buscar.length === 0) {
        // Si el usuario borra el buscador, volvemos a mostrar los últimos registros
        cargarUltimosPacientes();
      }
      
    }, 400); // Espera 400ms después de que el usuario deja de escribir

    // Limpiamos el temporizador si el usuario sigue escribiendo antes de los 400ms
    return () => clearTimeout(delayDebounceFn);
  }, [buscar]);

  const cargarUltimosPacientes = async () => {
    setLoading(true);
    setHaBuscado(true);
    
    try {
      const url = `${API_BASE_URL}/api/pacientes?page=1&per_page=${porPagina}`;
      
      const response = await authFetch(url);
      const data = await response.json();
      
      setPacientes(data.pacientes || []);
      setTotalPaginas(data.total_pages || 1);
      setTotalPacientes(data.total || 0);
      setPaginaActual(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buscarPacientes = async (page = 1) => {
    setLoading(true);
    setHaBuscado(true);
    
    try {
      let url = `${API_BASE_URL}/api/pacientes?page=${page}&per_page=${porPagina}`;
      if (buscar) {
        url += `&search=${buscar}`;
      }
      
      const response = await authFetch(url);
      const data = await response.json();
      
      setPacientes(data.pacientes || []);
      setTotalPaginas(data.total_pages || 1);
      setTotalPacientes(data.total || 0);
      setPaginaActual(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    setPaginaActual(1);
    buscarPacientes(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-black">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-black text-black tracking-tight">Pacientes</h1>
        <div className="flex gap-3">
          <Link href="/">
            <button className="flex items-center justify-center bg-gray-100 text-gray-600 w-12 h-12 rounded-2xl hover:bg-gray-200 transition-all border border-gray-200">
              <Home className="w-6 h-6" />
            </button>
          </Link>
          <Link href="/pacientes/nuevo">
            <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl hover:bg-gray-800 transition-all shadow-lg font-bold">
              <UserPlus className="w-6 h-6" /> 
              <span>Nuevo Paciente</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Buscador Estilo Unificado */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o documento..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className="flex-1 md:w-96 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-black transition-all bg-white shadow-sm"
        />
        <button
          onClick={handleBuscar}
          className="hidden md:block px-6 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition font-bold"
        >
          Buscar
        </button>
      </div>

      {/* Contador de resultados */}
      {haBuscado && !loading && (
        <div className="mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
          Mostrando {pacientes.length} de {totalPacientes} pacientes encontrados
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs uppercase font-black">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Teléfono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                    Cargando pacientes...
                  </td>
                </tr>
              ) : pacientes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                    No hay pacientes registrados
                  </td>
                </tr>
              ) : (
                pacientes.map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => router.push(`/pacientes/${p.id}`)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-sm text-gray-400 font-bold">#{p.id}</td>
                    <td className="px-6 py-4 font-bold text-black group-hover:text-black transition-colors">
                      {p.nombres} {p.apellidos}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.documento || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{p.telefono}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {haBuscado && !loading && totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => buscarPacientes(paginaActual - 1)}
            disabled={paginaActual === 1}
            className={`px-5 py-2 rounded-xl font-medium ${
              paginaActual === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ← Anterior
          </button>
          
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium">
              {paginaActual}
            </span>
            <span className="text-gray-500 text-sm">de {totalPaginas}</span>
          </div>
          
          <button
            onClick={() => buscarPacientes(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className={`px-5 py-2 rounded-xl font-medium ${
              paginaActual === totalPaginas
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
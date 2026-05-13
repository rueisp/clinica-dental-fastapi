'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import { 
  Search, ArrowLeft, Eye, EyeOff, Plus, User, 
  TrendingUp, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';

export default function HistorialPagos() {
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE PRIVACIDAD Y FILTROS ---
  const [mostrarTotal, setMostrarTotal] = useState(false); 
  const [mostrarHistorialAnual, setMostrarHistorialAnual] = useState(false); // Nuevo: Controla el desplegable del historial
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth()); 
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 5;

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    try {
      const res = await authFetch(API_ENDPOINTS.LISTAR_PAGOS);
      if (res.ok) {
        const data = await res.json();
        setPagos(data);
      }
    } catch (err) {
      console.error("Error cargando pagos:", err);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
    // 1. Empezamos con la lista completa de pagos
    let result = pagos;

    // 2. Aplicamos el filtro de Fecha (Mes y Año). 
    // Esto siempre se ejecuta para que la tabla no muestre miles de datos de otros años.
    result = result.filter(p => {
      // 1. Extraemos los números directamente del texto "2026-05-03"
      const [anioStr, mesStr] = p.fecha.split('-');
      const anio = parseInt(anioStr);
      const mes = parseInt(mesStr); // Este viene 1-12

      // 2. Comparamos directamente los números
      // (Restamos 1 al mes porque mesSeleccionado es 0-11)
      return (mes - 1) === parseInt(mesSeleccionado) && 
             anio === parseInt(anioSeleccionado);
    });

    if (busqueda.length >= 3) {
      // Convertimos la búsqueda en una lista de palabras
      const terminos = busqueda.toLowerCase().split(' ').filter(t => t !== '');

      result = result.filter(p => {
        const nombre = (p.paciente_nombre || '').toLowerCase();
        const codigo = (p.codigo || '').toLowerCase();

        // Verificamos que TODAS las palabras estén presentes
        return terminos.every(t => nombre.includes(t) || codigo.includes(t));
      });
    }

    // 4. Actualizamos el estado con el resultado final y volvemos a la página 1
    setFiltrados(result);
    setPaginaActual(1);
  }, [busqueda, pagos, mesSeleccionado, anioSeleccionado]);

  // Cálculo para el historial de meses
  const calcularIngresoMensual = (mesIndex) => {
    return pagos
      .filter(p => {
        const [anio, mes] = p.fecha.split('-').map(Number);
        return (mes - 1) === mesIndex && anio === anioSeleccionado;
      })
      .reduce((acc, p) => acc + p.monto, 0);
  };


  const totalRecaudado = filtrados.reduce((acc, p) => acc + p.monto, 0);
  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPaginados = filtrados.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina);

  const eliminarPago = async (id, codigo) => {
    // 1. Confirmación de seguridad
    if (!window.confirm(`¿Estás seguro de eliminar el recibo ${codigo}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/pagos/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // 2. Actualizar el estado local para que el pago desaparezca de la tabla sin recargar
        setPagos(prev => prev.filter(p => p.id !== id));
        alert("Pago eliminado correctamente");
      } else {
        alert("No se pudo eliminar el pago");
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert("Ocurrió un error al intentar eliminar");
    }
  };

  const formatearCOP = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(valor);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button onClick={() => router.push('/')} className="flex items-center text-gray-500 mb-2 hover:text-black transition-colors">
              <ArrowLeft size={18} className="mr-1" /> Inicio
            </button>
            <h1 className="text-3xl font-black tracking-tight">Gestión de Ingresos</h1>
          </div>
          <button onClick={() => router.push('/pagos/nuevo')} className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-gray-800 transition-all">
            <Plus size={20} /> Nuevo Cobro
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Card Total Principal */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl">
                <TrendingUp size={32} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Recaudación {meses[mesSeleccionado]}</p>
                <div className="flex items-center gap-3">
                  <p className={`text-4xl font-black transition-all duration-300 ${!mostrarTotal ? 'blur-md select-none' : ''}`}>
                    {formatearCOP(totalRecaudado)}
                  </p>
                  <button onClick={() => setMostrarTotal(!mostrarTotal)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                    {mostrarTotal ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2 border-t md:border-none pt-4 md:pt-0">
               <select 
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                className="bg-gray-100 border-none rounded-xl font-bold text-sm p-2 outline-none cursor-pointer"
               >
                 {meses.map((m, i) => (
                   <option key={i} value={i}>{m}</option>
                 ))}
               </select>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{filtrados.length} registros</p>
            </div>
          </div>

          {/* Card Historial Anual (Tipo Desplegable y Privado) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 self-start overflow-hidden transition-all duration-300">
            <button 
              onClick={() => setMostrarHistorialAnual(!mostrarHistorialAnual)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <CalendarDays size={18}/>
                </div>
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-tight">
                  Historial {anioSeleccionado}
                </h3>
              </div>
              {mostrarHistorialAnual ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
            </button>

            {mostrarHistorialAnual && (
              <div className="px-6 pb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Mostramos los 3 meses anteriores al seleccionado para no saturar */}
                {[mesSeleccionado - 1, mesSeleccionado - 2, mesSeleccionado - 3].map((mIdx) => {
                  if (mIdx < 0) return null;
                  const montoMes = calcularIngresoMensual(mIdx);
                  return (
                    <div key={mIdx} className="flex justify-between items-center group">
                      <span className="text-gray-500 text-sm font-bold">{meses[mIdx]}</span>
                      <span className={`text-sm font-black transition-all ${!mostrarTotal ? 'blur-sm select-none' : ''}`}>
                        {formatearCOP(montoMes)}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-4 border-t border-dashed border-gray-100">
                   <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">
                     Los montos siguen la privacidad del total principal
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buscador Estilo Unificado */}
        <div className="flex gap-3 mb-6">
        <input
            type="text"
            placeholder="Buscar por paciente o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 md:w-96 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-black transition-all bg-white"
        />
        <button
            className="hidden md:block px-6 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition font-bold"
            onClick={() => cargarPagos()} // Opcional: refresca los datos
        >
            Buscar
        </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto text-black">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs uppercase font-black">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="hidden sm:table-cell px-6 py-4">Método</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                  {!loading && itemsPaginados.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/pagos/recibo/${pago.codigo}`)}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col leading-none">
                          <span className="font-bold text-gray-900">{pago.fecha.split('-').reverse().map(n => parseInt(n)).join('/')}</span>
                          <span className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-tighter">#{pago.codigo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col leading-tight min-w-0">
                          {(() => {
                            const partes = pago.paciente_nombre?.split(' ') || [];
                            const nombres = partes.slice(0, 2).join(' ');
                            const apellidos = partes.slice(2).join(' ');
                            return (
                              <>
                                <span className="font-bold text-black truncate max-w-[140px] sm:max-w-none">{nombres}</span>
                                <span className="text-sm font-bold text-gray-500 truncate max-w-[140px] sm:max-w-none ">{apellidos || ' '}</span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-600">
                          {pago.metodo_pago || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-gray-900">{formatearCOP(pago.monto)}</span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => router.push(`/pagos/recibo/${pago.codigo}`)} className="p-2 hover:bg-black hover:text-white rounded-xl transition-all text-gray-400">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => eliminarPago(pago.id, pago.codigo)} className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all text-gray-400">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
          {/* Paginación */}
          {filtrados.length > itemsPorPagina && (
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Página {paginaActual} de {totalPaginas}</p>
              <div className="flex gap-2">
                <button onClick={() => setPaginaActual(p => Math.max(p - 1, 1))} disabled={paginaActual === 1} className="p-2 bg-white border rounded-xl disabled:opacity-20"><ChevronLeft size={20}/></button>
                <button onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))} disabled={paginaActual === totalPaginas} className="p-2 bg-white border rounded-xl disabled:opacity-20"><ChevronRight size={20}/></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
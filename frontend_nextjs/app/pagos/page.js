export default function HistorialPagos() {
  const router = useRouter();
  
  // --- ESTADOS PRINCIPALES ---
  const [pagos, setPagos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE PRIVACIDAD Y FILTROS ---
  const [mostrarTotal, setMostrarTotal] = useState(false); 
  const [mostrarHistorialAnual, setMostrarHistorialAnual] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth()); 
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  // --- ESTADOS DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // 1. FUNCIÓN DE CARGA: Trae los datos filtrados del servidor
  const cargarPagos = async () => {
    setLoading(true);
    try {
      const query = `?mes=${mesSeleccionado + 1}&anio=${anioSeleccionado}&page=${paginaActual}&per_page=5`;
      const res = await authFetch(API_ENDPOINTS.LISTAR_PAGOS(query));
      
      if (res.ok) {
        const data = await res.json();
        setPagos(data.pagos || []);
        setFiltrados(data.pagos || []);
        setTotalPaginas(data.total_pages || 1);
        setTotalRegistros(data.total || 0);
      }
    } catch (err) {
      console.error("Error cargando pagos:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. EFECTO: Se activa al cambiar mes, año o página
  useEffect(() => {
    cargarPagos();
  }, [mesSeleccionado, anioSeleccionado, paginaActual]);

  // 3. EFECTO: Reinicia a página 1 solo cuando cambias el filtro de tiempo
  useEffect(() => {
    setPaginaActual(1);
  }, [mesSeleccionado, anioSeleccionado]);

  // 4. EFECTO DE BÚSQUEDA: Filtra localmente lo que ya está en pantalla
  useEffect(() => {
    if (busqueda.trim().length < 3) {
      setFiltrados(pagos);
      return;
    }

    const terminos = busqueda.toLowerCase().split(' ').filter(t => t !== '');
    const result = pagos.filter(p => {
      const nombre = (p.paciente_nombre || '').toLowerCase();
      const codigo = (p.codigo || '').toLowerCase();
      return terminos.every(t => nombre.includes(t) || codigo.includes(t));
    });

    setFiltrados(result);
  }, [busqueda, pagos]);

  // FUNCIÓN AGREGADA: Formatea la fecha de forma segura sin usar zonas horarias del navegador
  const formatearFechaTabla = (fechaStr) => {
    if (!fechaStr) return '-';
    const partes = fechaStr.split('T')[0].split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
  };

  const totalRecaudado = filtrados.reduce((acc, p) => acc + p.monto, 0);

  const eliminarPago = async (id, codigo) => {
    if (!window.confirm(`¿Estás seguro de eliminar el recibo ${codigo}?`)) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/api/pagos/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Pago eliminado correctamente");
        cargarPagos();
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
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
               <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">
                 Página {paginaActual} de {totalPaginas} ({totalRegistros} total)
               </p>
            </div>
          </div>

          {/* Card Historial Anual */}
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
              <div className="px-6 pb-6 pt-2 space-y-4">
                <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest pt-2">
                   Filtra arriba para ver otros meses
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Buscador */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar por paciente o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 md:w-96 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-black transition-all bg-white shadow-sm"
          />
        </div>

        {/* Tabla de Resultados */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs uppercase font-black">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="hidden sm:table-cell px-6 py-4">Concepto</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!loading && filtrados.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/pagos/recibo/${pago.codigo}`)}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col leading-none">
                        <span className="font-bold text-gray-900">
                          {formatearFechaTabla(pago.fecha)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-tighter">
                          #{pago.codigo?.split('-').pop()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-black truncate max-w-[140px] capitalize">
                        {pago.paciente_nombre?.toLowerCase()}
                      </p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-600">
                        {pago.concepto || 'Consulta'}
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
          {totalPaginas > 1 && (
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Página {paginaActual} de {totalPaginas}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPaginaActual(p => Math.max(p - 1, 1))} 
                  disabled={paginaActual === 1} 
                  className="p-2 bg-white border rounded-xl disabled:opacity-20 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={20}/>
                </button>
                <button 
                  onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))} 
                  disabled={paginaActual === totalPaginas} 
                  className="p-2 bg-white border rounded-xl disabled:opacity-20 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={20}/>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
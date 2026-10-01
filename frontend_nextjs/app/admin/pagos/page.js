'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import { useUser } from '@/context/UserContext';
import AuthGuard from '@/components/AuthGuard';
import { 
    Check, ExternalLink, User, DollarSign, Image as ImageIcon, 
    Eye, Users, CreditCard, Clock, ShieldCheck, Search,
    Trash2, ChevronLeft, ChevronRight, AlertTriangle, X
} from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    const [tab, setTab] = useState('pagos'); // 'pagos' o 'usuarios'
    const [pagos, setPagos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Paginación y Modal Seguro de Eliminación
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 7;
    const [doctorAEliminar, setDoctorAEliminar] = useState(null);
    const [palabraConfirmar, setPalabraConfirmar] = useState('');
    const [eliminandoDoctor, setEliminandoDoctor] = useState(false);
    const [filaSeleccionada, setFilaSeleccionada] = useState(null);

    // Resetea la página a 1 si el usuario escribe en el buscador
    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    // Candado de seguridad: solo el Administrador puede permanecer en esta consola
    useEffect(() => {
        if (!userLoading && user && !user.is_admin) {
            alert('⚠️ Acceso restringido. Esta sección es exclusiva para el administrador.');
            router.replace('/dashboard');
        }
    }, [user, userLoading, router]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Cargamos ambas listas al tiempo
            const [resPagos, resUsers] = await Promise.all([
                authFetch(API_ENDPOINTS.ADMIN_PAGOS_PENDIENTES),
                authFetch(API_ENDPOINTS.ADMIN_RESUMEN_USUARIOS)
            ]);

            if (resPagos.ok) setPagos(await resPagos.json());
            if (resUsers.ok) setUsuarios(await resUsers.json());
        } catch (err) {
            console.error("Error cargando panel admin:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleAprobar = async (id) => {
        if (!confirm("¿Confirmas que el dinero está en tu cuenta?")) return;
        try {
            const res = await authFetch(API_ENDPOINTS.APROBAR_PAGO(id), { method: 'POST' });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                alert(data.message || "¡Suscripción activada con éxito!");
                cargarDatos();
            } else {
                alert(`❌ Error al activar: ${data.detail || "No se pudo procesar la aprobación."}`);
            }
        } catch (err) {
            alert("Error de conexión al activar el pago.");
        }
    };

    const handleRechazar = async (id) => {
        if (!confirm("¿Deseas rechazar este pago? El doctor podrá intentar reportar de nuevo.")) return;
        try {
            const res = await authFetch(API_ENDPOINTS.RECHAZAR_PAGO(id), { method: 'POST' });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                alert(data.message || "Pago rechazado y usuario liberado.");
                cargarDatos();
            } else {
                alert(`❌ Error al rechazar: ${data.detail || "No se pudo procesar el rechazo."}`);
            }
        } catch (err) {
            alert("Error de conexión al procesar el rechazo.");
        }
    };

    // Filtrar usuarios por búsqueda
    const usuariosFiltrados = usuarios.filter(u => 
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        u.email.toLowerCase().includes(busqueda.toLowerCase())
    );

    

    const handleEliminarDoctor = async () => {
        if (!doctorAEliminar || palabraConfirmar.trim().toUpperCase() !== 'ELIMINAR') return;
        setEliminandoDoctor(true);
        try {
            const res = await authFetch(API_ENDPOINTS.ADMIN_ELIMINAR_USUARIO(doctorAEliminar.id), {
                method: 'DELETE'
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                alert(data.message || "Doctor eliminado exitosamente.");
                setDoctorAEliminar(null);
                setPalabraConfirmar('');
                cargarDatos();
            } else {
                alert("❌ Error: " + (data.detail || "No se pudo eliminar el doctor"));
            }
        } catch (err) {
            alert("❌ Error de conexión al eliminar doctor");
        } finally {
            setEliminandoDoctor(false);
        }
    };

    // Paginación de 7 doctores por página sobre los resultados filtrados
    const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA));
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const usuariosPaginados = usuariosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-purple-600 animate-pulse uppercase tracking-widest text-xs">Accediendo a la bóveda...</p>
        </div>
    );

    return (
        <AuthGuard>
            <div className="max-w-6xl mx-auto py-8 px-4">
                {/* Cabecera Principal */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Control Central</h1>
                        <p className="text-gray-500 font-medium">Gestión de ingresos y red de odontólogos.</p>
                    </div>
                    
                    {/* Selector de Pestañas Estilo Apple */}
                    <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
                        <button 
                            onClick={() => setTab('pagos')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'pagos' ? 'bg-white shadow-md text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <DollarSign size={18} /> Validar Pagos 
                            {pagos.length > 0 && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full">{pagos.length}</span>}
                        </button>
                        <button 
                            onClick={() => setTab('usuarios')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'usuarios' ? 'bg-white shadow-md text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Users size={18} /> Red de Doctores
                        </button>
                    </div>
                </div>

                {/* CONTENIDO: PESTAÑA PAGOS PENDIENTES */}
                {tab === 'pagos' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {pagos.length === 0 ? (
                            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
                                <ShieldCheck className="w-16 h-16 text-green-200 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold">Todo al día. No hay pagos por revisar.</p>
                            </div>
                        ) : (
                            pagos.map((item) => (
                                <div key={item.pago.id} className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
                                    <div className="p-8">
                                        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                                                    <User size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-gray-800">{item.pago.usuario_nombre}</h2>
                                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{item.pago.usuario_email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto a Validar</p>
                                                <p className="font-black text-green-600 text-3xl">${item.pago.monto.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-2xl mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Plan Solicitado</p>
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={14} className="text-purple-500" />
                                                    <p className="font-black text-gray-700">{item.pago.plan_nombre}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Referencia / Celular</p>
                                                <p className="font-mono text-sm font-black text-gray-700">{item.pago.referencia_pago}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Fecha de Reporte</p>
                                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <Clock size={14} />
                                                    {new Date(item.pago.fecha_reporte).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => window.open(item.pago.comprobante_url, '_blank')}
                                                className="flex-1 bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 tracking-widest"
                                            >
                                                <Eye size={18} /> VER
                                            </button>
                                            
                                            {/* --- BOTÓN DE RECHAZO --- */}
                                            <button 
                                                onClick={() => handleRechazar(item.pago.id)}
                                                className="px-6 bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-black text-xs hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                DENEGAR
                                            </button>

                                            <button 
                                                onClick={() => handleAprobar(item.pago.id)}
                                                className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-xs hover:bg-purple-700 transition-all flex items-center justify-center gap-2 tracking-widest shadow-lg shadow-gray-200"
                                            >
                                                <Check size={18} /> APROBAR ACCESO
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* CONTENIDO: PESTAÑA RED DE DOCTORES */}
                {tab === 'usuarios' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por nombre o correo del doctor..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-200 font-medium"
                                    />
                                </div>
                                <div className="bg-gray-100 px-4 py-3 rounded-2xl text-xs font-black text-gray-500">
                                    {usuarios.length} REGISTRADOS
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50">
                                            <th className="px-8 py-5">Doctor</th>
                                            <th className="px-8 py-5 text-center">Plan Actual</th>
                                            <th className="px-8 py-5 text-center">Pacientes</th>
                                            <th className="px-8 py-5 text-center">Estado</th>
                                            <th className="px-8 py-5 text-center">Vencimiento</th>
                                            <th className="px-8 py-5 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {usuariosPaginados.map((u) => {
                                            const esAdmin = u.email === user?.email || (u.nombre || '').toLowerCase().includes('administrador');
                                            const estaSeleccionado = filaSeleccionada === u.id;

                                            return (
                                                <tr 
                                                    key={u.id} 
                                                    onClick={() => setFilaSeleccionada(u.id)}
                                                    className={`transition-all cursor-pointer ${
                                                        estaSeleccionado 
                                                            ? 'bg-gray-200/80 border-l-4 border-gray-700 shadow-sm' 
                                                            : 'hover:bg-gray-50/50'
                                                    }`}
                                                >
                                                    <td className="px-8 py-5">
                                                        <p className="font-black text-gray-800">{u.nombre.replace('None', '')}</p>
                                                        <p className="text-xs font-bold text-gray-400">{u.email}</p>
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${(u.plan_actual || '').toLowerCase().includes('pro') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {(u.plan_actual || 'Sin Plan').replace(/_/g, ' ').toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-center font-black text-gray-700 text-sm">
                                                        {u.total_pacientes}
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    u.estado === 'active' 
                                                                        ? 'bg-green-500 animate-pulse' 
                                                                        : u.estado === 'expired' 
                                                                            ? 'bg-red-500' 
                                                                            : 'bg-gray-400'
                                                                }`}></div>
                                                                <span className={`text-xs font-black uppercase tracking-tight ${
                                                                    u.estado === 'active' 
                                                                        ? 'text-green-700' 
                                                                        : u.estado === 'expired' 
                                                                            ? 'text-red-600' 
                                                                            : 'text-gray-500'
                                                                }`}>
                                                                    {u.estado === 'active' ? 'ACTIVO' : u.estado === 'expired' ? 'VENCIDO' : 'SUSPENDIDO'}
                                                                </span>
                                                            </div>
                                                            
                                                            {u.estado !== 'active' ? (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (confirm(`¿Deseas activar manualmente a ${u.nombre}?`)) {
                                                                            try {
                                                                                const res = await authFetch(API_ENDPOINTS.ACTIVAR_MANUAL(u.id), { method: 'POST' });
                                                                                const data = await res.json();
                                                                                if (res.ok) {
                                                                                    alert("✅ ¡Doctor activado con éxito!");
                                                                                    cargarDatos();
                                                                                } else {
                                                                                    alert("❌ Error: " + (data.detail || "No se pudo activar"));
                                                                                }
                                                                            } catch (err) {
                                                                                alert("❌ Error de conexión al activar");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-[9px] bg-black text-white px-2.5 py-1 rounded-md font-bold hover:bg-purple-600 transition-colors cursor-pointer shadow-sm"
                                                                >
                                                                    ACTIVAR AHORA
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (confirm(`⚠️ ¿Estás seguro de suspender la cuenta de ${u.nombre}? Perderá acceso inmediato a la plataforma.`)) {
                                                                            try {
                                                                                const res = await authFetch(API_ENDPOINTS.SUSPENDER_MANUAL(u.id), { method: 'POST' });
                                                                                const data = await res.json();
                                                                                if (res.ok) {
                                                                                    alert("🛑 ¡Cuenta suspendida con éxito!");
                                                                                    cargarDatos();
                                                                                } else {
                                                                                    alert("❌ Error: " + (data.detail || "No se pudo suspender"));
                                                                                }
                                                                            } catch (err) {
                                                                                alert("❌ Error de conexión al suspender");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-md font-bold hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                                                                >
                                                                    SUSPENDER
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <p className="text-sm font-black text-gray-700">{u.vence}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Medianoche</p>
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        {!esAdmin ? (
                                                            <button
                                                                onClick={() => {
                                                                    setDoctorAEliminar(u);
                                                                    setPalabraConfirmar('');
                                                                }}
                                                                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                                title={`Eliminar cuenta de ${u.nombre}`}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-300 uppercase">Protegido</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación de 7 Doctores por Página */}
                            {totalPaginas > 1 && (
                                <div className="p-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">
                                        Pág. {paginaActual} de {totalPaginas} ({usuariosFiltrados.length} doctores)
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                            disabled={paginaActual === 1}
                                            className="p-2 bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                            disabled={paginaActual === totalPaginas}
                                            className="p-2 bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Modal Seguro de Eliminación de Cuenta */}
                            {doctorAEliminar && (
                                <div 
                                    onClick={() => setDoctorAEliminar(null)} 
                                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                                >
                                    <div 
                                        onClick={(e) => e.stopPropagation()} 
                                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 border border-red-100 animate-in fade-in zoom-in-95 cursor-default text-black"
                                    >
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                            <div className="flex items-center gap-2 text-red-600 font-black text-base">
                                                <AlertTriangle size={20} />
                                                <span>¿Eliminar Cuenta de Doctor?</span>
                                            </div>
                                            <button 
                                                onClick={() => setDoctorAEliminar(null)} 
                                                className="p-1 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                                            <p className="font-bold text-gray-900">
                                                Esta acción es irreversible y ejecutará un borrado en cascada para:
                                            </p>
                                            <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-100 text-red-950 font-medium space-y-1">
                                                <p>• <strong>Doctor:</strong> {doctorAEliminar.nombre}</p>
                                                <p>• <strong>Correo:</strong> {doctorAEliminar.email}</p>
                                                <p className="pt-1 text-[11px] text-red-700">
                                                    Se borrarán permanentemente sus pacientes ({doctorAEliminar.total_pacientes}), citas, historial, pagos y su bot de WhatsApp.
                                                </p>
                                            </div>
                                            <p className="pt-1">
                                                Para confirmar la eliminación permanente, escribe la palabra <strong className="text-black font-mono font-black">ELIMINAR</strong>:
                                            </p>
                                            <input
                                                type="text"
                                                value={palabraConfirmar}
                                                onChange={(e) => setPalabraConfirmar(e.target.value)}
                                                placeholder="Escribe ELIMINAR"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-center tracking-wider outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setDoctorAEliminar(null)}
                                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleEliminarDoctor}
                                                disabled={palabraConfirmar.trim().toUpperCase() !== 'ELIMINAR' || eliminandoDoctor}
                                                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Trash2 size={14} />
                                                <span>{eliminandoDoctor ? 'Eliminando...' : 'Sí, eliminar cuenta'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
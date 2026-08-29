'use client';
import { useState, useEffect } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import { User, Shield, CreditCard, Save, Lock, Smartphone, Building, Database, Download } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

export default function PerfilPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plan, setPlan] = useState(null);
    
    // Estados para los formularios
    const [perfil, setPerfil] = useState({
        nombres: '', apellidos: '', nombre_consultorio: '', telefono: ''
    });
    const [passwords, setPasswords] = useState({
        old_password: '', new_password: '', confirm_password: ''
    });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            // AHORA SOLO HACEMOS UNA LLAMADA
            const res = await authFetch(API_ENDPOINTS.ACTUALIZAR_PERFIL);
            if (res.ok) {
                const data = await res.json();
                setPerfil({
                    nombres: data.nombres || '',
                    apellidos: data.apellidos || '',
                    nombre_consultorio: data.nombre_consultorio || '',
                    telefono: data.telefono || ''
                });
                // Guardamos la info del plan que ahora viene aquí mismo
                setPlan(data.plan_info);
            }
        } catch (err) {
            console.error("Error cargando perfil:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleActualizarPerfil = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await authFetch(API_ENDPOINTS.ACTUALIZAR_PERFIL, {
                method: 'PUT',
                body: JSON.stringify(perfil)
            });
            if (res.ok) alert("¡Perfil actualizado con éxito!");
            else alert("Error al actualizar");
        } catch (err) {
            alert("Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    const handleCambiarPassword = async (e) => {
        e.preventDefault();
        if (passwords.new_password !== passwords.confirm_password) {
            return alert("Las contraseñas nuevas no coinciden");
        }
        setSaving(true);
        try {
            const res = await authFetch(API_ENDPOINTS.CAMBIAR_PASSWORD, {
                method: 'PUT',
                body: JSON.stringify({
                    old_password: passwords.old_password,
                    new_password: passwords.new_password
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Contraseña actualizada");
                setPasswords({ old_password: '', new_password: '', confirm_password: '' });
            } else {
                alert(data.detail || "Error al cambiar contraseña");
            }
        } catch (err) {
            alert("Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    const [downloadingBackup, setDownloadingBackup] = useState(false);

    const handleDescargarBackup = async () => {
        setDownloadingBackup(true);
        try {
            const res = await authFetch(API_ENDPOINTS.EXPORTAR_BACKUP_EXCEL);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // Si el error es un objeto/arreglo de Pydantic, lo convertimos a texto plano
                const detalleError = typeof data.detail === 'string' 
                    ? data.detail 
                    : (Array.isArray(data.detail) ? data.detail[0]?.msg : 'Error al generar la copia de respaldo');
                throw new Error(detalleError);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fechaHoy = new Date().toISOString().split('T')[0];
            a.download = `Backup_Pacientes_${fechaHoy}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.message || "No se pudo descargar la copia de respaldo");
        } finally {
            setDownloadingBackup(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse">Cargando tu perfil...</div>;

    return (
        <AuthGuard>
            <div className="max-w-5xl mx-auto py-8 px-4 text-black">
                <h1 className="text-3xl font-black mb-8 tracking-tight">Mi Configuración</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUMNA IZQUIERDA: MARCA PERSONAL */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <User size={24} />
                                </div>
                                <h2 className="text-xl font-bold">Información de Marca</h2>
                            </div>

                            <form onSubmit={handleActualizarPerfil} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nombres</label>
                                    <input 
                                        type="text" value={perfil.nombres}
                                        onChange={(e) => setPerfil({...perfil, nombres: e.target.value})}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Apellidos</label>
                                    <input 
                                        type="text" value={perfil.apellidos}
                                        onChange={(e) => setPerfil({...perfil, apellidos: e.target.value})}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nombre del Consultorio</label>
                                    <div className="relative">
                                        <Building size={16} className="absolute left-3 top-3.5 text-gray-400" />
                                        <input 
                                            type="text" placeholder="Ej: Clínica Dental Smile"
                                            value={perfil.nombre_consultorio}
                                            onChange={(e) => setPerfil({...perfil, nombre_consultorio: e.target.value})}
                                            className="w-full pl-10 p-3 bg-gray-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Teléfono Profesional</label>
                                    <div className="relative">
                                        <Smartphone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                                        <input 
                                            type="text" placeholder="300 123 4567"
                                            value={perfil.telefono}
                                            onChange={(e) => setPerfil({...perfil, telefono: e.target.value})}
                                            className="w-full pl-10 p-3 bg-gray-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 pt-4">
                                    <button 
                                        disabled={saving}
                                        className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg"
                                    >
                                        <Save size={20} /> {saving ? 'Guardando...' : 'Actualizar mis datos'}
                                    </button>
                                </div>
                            </form>
                        </section>

                        {/* SECCIÓN SEGURIDAD */}
                        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                                    <Shield size={24} />
                                </div>
                                <h2 className="text-xl font-bold">Seguridad y Acceso</h2>
                            </div>

                            <form onSubmit={handleCambiarPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Contraseña Actual</label>
                                    <input 
                                        type="password" required
                                        value={passwords.old_password}
                                        onChange={(e) => setPasswords({...passwords, old_password: e.target.value})}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nueva Contraseña</label>
                                        <input 
                                            type="password" required
                                            value={passwords.new_password}
                                            onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
                                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Confirmar Nueva</label>
                                        <input 
                                            type="password" required
                                            value={passwords.confirm_password}
                                            onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </div>
                                <button className="flex items-center gap-2 text-red-600 font-bold text-sm hover:underline pt-2">
                                    <Lock size={16} /> Cambiar contraseña ahora
                                </button>
                            </form>
                        </section>

                        {/* SECCIÓN RESPALDO Y PORTABILIDAD */}
                        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Respaldo y Portabilidad de Datos</h2>
                                    <p className="text-xs text-gray-400 font-medium">Descarga una copia completa de la lista y fichas de tus pacientes en formato Excel en cualquier momento (Ley 1581 / Habeas Data).</p>
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={handleDescargarBackup}
                                disabled={downloadingBackup}
                                className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                            >
                                <Download size={20} /> 
                                {downloadingBackup ? 'Generando Copia de Seguridad...' : 'Descargar Copia de Respaldo (Excel)'}
                            </button>
                        </section>

                    </div>

                    {/* COLUMNA DERECHA: SUSCRIPCIÓN */}
                    <div className="space-y-6">
                        <section className="bg-black text-white rounded-3xl p-8 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <CreditCard size={24} className="text-blue-400" />
                                <h2 className="text-xl font-bold">Suscripción</h2>
                            </div>
                            
                            <div className="mb-6">
                                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Plan Actual</p>
                                <p className="text-2xl font-black capitalize">{plan?.nombre || 'Cargando...'}</p>
                            </div>

                            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-xs text-gray-300 font-bold uppercase">Estado</p>
                                    <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black rounded-full uppercase">Activo</span>
                                </div>
                                <p className="text-xs text-gray-400 italic">Vence el: {plan?.fecha_fin || '...'}</p>
                            </div>

                            <button 
                                onClick={() => window.location.href = '/planes'}
                                className="w-full py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                Gestionar Planes
                            </button>
                        </section>
                        
                        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                             <h4 className="font-bold text-blue-800 text-sm mb-2">¿Necesitas ayuda?</h4>
                             <p className="text-blue-600 text-xs leading-relaxed">
                                Si tienes problemas con tu cuenta o pagos, contáctanos directamente por correo electrónico a cloudentapp.cliente@gmail.com.
                             </p>
                        </div>
                    </div>

                </div>
            </div>
        </AuthGuard>
    );
}
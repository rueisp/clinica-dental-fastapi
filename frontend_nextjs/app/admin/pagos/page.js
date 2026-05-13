'use client';
import { useState, useEffect } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import { Check, X, ExternalLink, User, DollarSign, Image as ImageIcon, Eye } from 'lucide-react';

export default function AdminPagos() {
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);

    const cargarPagos = async () => {
        try {
            const res = await authFetch(API_ENDPOINTS.ADMIN_PAGOS_PENDIENTES);
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

    useEffect(() => { cargarPagos(); }, []);

    const handleAprobar = async (id) => {
        if (!confirm("¿Confirmas que el dinero está en tu cuenta?")) return;
        try {
            const res = await authFetch(API_ENDPOINTS.APROBAR_PAGO(id), { method: 'POST' });
            if (res.ok) {
                alert("¡Suscripción activada con éxito!");
                cargarPagos();
            }
        } catch (err) {
            alert("Error al activar");
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-purple-600 animate-pulse">Consultando pagos pendientes...</div>;

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900">Panel de Control</h1>
                    <p className="text-gray-500">Valida los comprobantes de pago de tus clientes.</p>
                </div>
                <div className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-2xl shadow-lg shadow-purple-200">
                    {pagos.length} <span className="text-sm font-normal opacity-80">pendientes</span>
                </div>
            </div>

            {pagos.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
                    <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">No hay pagos nuevos por revisar.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pagos.map((item) => (
                        <div key={item.pago.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                {/* Cabecera con doctor y monto */}
                                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                                            <User size={14} />
                                            <p className="text-[10px] font-black uppercase tracking-wider">Doctor Solicitante</p>
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-800">{item.pago.usuario_nombre}</h2>
                                        <p className="text-sm text-gray-500">{item.pago.usuario_email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Monto Transferido</p>
                                        <p className="font-black text-green-600 text-2xl">${item.pago.monto.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Detalles del pago */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Plan</p>
                                        <p className="font-bold text-gray-700">{item.pago.plan_nombre || 'No especificado'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Referencia</p>
                                        <p className="font-mono text-sm font-bold text-gray-700">{item.pago.referencia_pago}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Fecha de Reporte</p>
                                        <p className="text-sm font-bold text-gray-700">
                                            {item.pago.fecha_reporte ? new Date(item.pago.fecha_reporte).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => window.open(item.pago.comprobante_url, '_blank')}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={18} /> VER COMPROBANTE
                                    </button>
                                    <button 
                                        onClick={() => handleAprobar(item.pago.id)}
                                        className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} /> ACTIVAR SUSCRIPCIÓN
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
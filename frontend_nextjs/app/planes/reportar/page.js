'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, authFetch } from '@/config/api';
import { Upload, CheckCircle, CreditCard, ArrowLeft } from 'lucide-react';

export default function ReportarPago() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // 1. Estados del formulario
    const [planId, setPlanId] = useState(searchParams.get('plan_id') || '');
    const [planNombre, setPlanNombre] = useState(searchParams.get('plan_nombre') || 'Plan Profesional');
    const [monto, setMonto] = useState('');
    const [referencia, setReferencia] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);

    // 2. Lógica para subir imagen a Cloudinary
    // Usaremos el mismo método que ya usas en el resto de tu app
    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default2'); // CAMBIA ESTO por tu preset

        try {
            const res = await fetch('https://api.cloudinary.com/v1_1/dlueb7c6r/image/upload', {// CAMBIA tu_cloud_name
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            setImageUrl(data.secure_url);
        } catch (err) {
            alert("Error al subir la imagen");
        } finally {
            setLoading(false);
        }
    };

    // 3. Enviar reporte al Backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageUrl) return alert("Por favor sube la captura del pago");

        setLoading(true);
        try {
            const response = await authFetch(API_ENDPOINTS.REPORTAR_PAGO, {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: planId,           // Se envía el UUID (string)
                    plan_nombre: planNombre,   // Se envía el nombre real (ej: "Básico", "Pro Mensual")
                    monto: parseFloat(monto),
                    comprobante_url: imageUrl,
                    referencia_pago: referencia
                })
            });

            if (response.ok) {
                setEnviado(true);
                setTimeout(() => router.push('/dashboard'), 3000);
            }
        } catch (err) {
            alert("Error al enviar el reporte");
        } finally {
            setLoading(false);
        }
    };

    if (enviado) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">¡Pago Reportado!</h2>
                    <p className="text-gray-600">Estamos verificando tu transferencia. Tu plan se activará en menos de 2 horas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-black">
                    <ArrowLeft size={20} /> Volver
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-purple-600 p-6 text-white">
                        <h1 className="text-2xl font-bold">Reportar Pago: {planNombre}</h1>
                        <p className="opacity-90">Completa los datos para activar tu suscripción.</p>
                    </div>

                    <div className="p-8">
                        {/* SECCIÓN DE DATOS BANCARIOS */}
                        <div className="mb-8 p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <h2 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                                <CreditCard size={18} /> Datos de Transferencia
                            </h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Nequi</p>
                                    <p className="font-bold text-lg">314-7953756</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Bancolombia (Ahorros)</p>
                                    <p className="font-bold text-lg">912-113608-82</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Monto Pagado</label>
                                    <input 
                                        type="number" placeholder="Ej: 30000" required
                                        value={monto} onChange={(e) => setMonto(e.target.value)}
                                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Referencia / Celular</label>
                                    <input 
                                        type="text" placeholder="Número de comprobante" required
                                        value={referencia} onChange={(e) => setReferencia(e.target.value)}
                                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            {/* SUBIDA DE IMAGEN */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Captura de Pantalla (Comprobante)</label>
                                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Pago" className="max-h-48 mx-auto rounded-lg" />
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Upload className="text-gray-400 mb-2" size={32} />
                                            <p className="text-gray-500 text-sm">Haz clic para subir la foto del recibo</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" accept="image/*" onChange={handleUploadImage}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" disabled={loading}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                {loading ? 'Procesando...' : 'ENVIAR REPORTE DE PAGO'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
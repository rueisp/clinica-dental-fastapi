'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, authFetch } from '@/config/api';
import { Upload, CheckCircle, CreditCard, ArrowLeft, Copy, Check, Zap } from 'lucide-react';

function ReportarPagoForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [planId, setPlanId] = useState(searchParams.get('plan_id') || '');
    const [planNombre, setPlanNombre] = useState(searchParams.get('plan_nombre') || 'Plan Profesional');
    const [monto, setMonto] = useState('');
    const [referencia, setReferencia] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [copiado, setCopiado] = useState(false);

    // --- ESTADOS PARA MONEDA Y PAYPAL ---
    const moneda = searchParams.get('moneda') || 'COP';
    const [copiadoPaypal, setCopiadoPaypal] = useState(false);

    // --- CONSTANTES DE DATOS DE PAGO ---
    const correoPaypal = "pagos@cloudentapp.com";
    const linkBold = "https://bold.co/p/cloudentapp"; // <-- Reemplace con su link único de Bold cuando esté activo


    const handleCopiarPaypal = () => {
        // Fallback robusto para entornos HTTP locales y dispositivos móviles
        const textArea = document.createElement("textarea");
        textArea.value = correoPaypal;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiadoPaypal(true);
            setTimeout(() => setCopiadoPaypal(false), 2000);
        } catch (err) {
            console.error('Error al copiar correo de PayPal', err);
        }
        document.body.removeChild(textArea);
    };


    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default2');

        try {
            const res = await fetch('https://api.cloudinary.com/v1_1/dlueb7c6r/image/upload', {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageUrl) return alert("Por favor sube la captura del pago");

        setLoading(true);
        try {
            const response = await authFetch(API_ENDPOINTS.REPORTAR_PAGO, {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: planId,
                    plan_nombre: planNombre,
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
                    <div className="bg-black p-6 text-white">
                        <h1 className="text-2xl font-bold">Reportar Pago: {planNombre}</h1>
                        <p className="opacity-90">Completa los datos para activar tu suscripción.</p>
                    </div>

                    <div className="p-8">
                        <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                    <CreditCard size={20} className="text-gray-600" /> Métodos de Pago Disponibles
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Realiza tu pago de forma segura y reporta el comprobante abajo para activar tu plan.
                                </p>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                                {/* Renderizado condicional del orden según la moneda */}
                                {moneda === 'USD' ? (
                                    <>
                                        {/* 1. PayPal (Primero si es USD) */}
                                        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    🌐 PayPal (Dólares / Internacional)
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    Envía tu pago de forma segura en dólares desde cualquier país a nuestra cuenta de PayPal:
                                                </p>
                                                <p className="font-mono font-black text-base text-blue-800 pt-1 break-all">{correoPaypal}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleCopiarPaypal}
                                                className={`sm:self-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shrink-0 min-w-[140px] cursor-pointer ${
                                                    copiadoPaypal 
                                                        ? 'bg-green-50 border-green-200 text-green-600' 
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95'
                                                }`}
                                            >
                                                {copiadoPaypal ? <Check size={14} /> : <Copy size={14} />}
                                                {copiadoPaypal ? '¡COPIADO!' : 'COPIAR CORREO'}
                                            </button>
                                        </div>

                                        {/* 2. Bold (Segundo si es USD) */}
                                        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    💳 Pago en Línea (PSE, Nequi, Bancolombia, Tarjetas)
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    Paga de forma segura al instante usando PSE, tarjetas de crédito o débito a través de Bold.
                                                </p>
                                                <p className="text-xs text-blue-600 font-bold pt-1">Disponible para cuentas en Colombia</p>
                                            </div>
                                            <a
                                                href={linkBold}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="sm:self-center px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 shrink-0 min-w-[140px] text-center"
                                            >
                                                PAGAR EN LÍNEA
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* 1. Bold (Primero si es COP) */}
                                        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    💳 Pago en Línea (PSE, Nequi, Bancolombia, Tarjetas)
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    Paga de forma segura al instante usando PSE, tarjetas de crédito o débito a través de Bold.
                                                </p>
                                                <p className="text-xs text-blue-600 font-bold pt-1">Recomendado para Colombia</p>
                                            </div>
                                            <a
                                                href={linkBold}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="sm:self-center px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 shrink-0 min-w-[140px] text-center"
                                            >
                                                PAGAR EN LÍNEA
                                            </a>
                                        </div>

                                        {/* 2. PayPal (Segundo si es COP) */}
                                        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    🌐 PayPal (Dólares / Internacional)
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    Envía tu pago de forma segura en dólares desde cualquier país a nuestra cuenta de PayPal:
                                                </p>
                                                <p className="font-mono font-black text-base text-blue-800 pt-1 break-all">{correoPaypal}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleCopiarPaypal}
                                                className={`sm:self-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shrink-0 min-w-[140px] cursor-pointer ${
                                                    copiadoPaypal 
                                                        ? 'bg-green-50 border-green-200 text-green-600' 
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95'
                                                }`}
                                            >
                                                {copiadoPaypal ? <Check size={14} /> : <Copy size={14} />}
                                                {copiadoPaypal ? '¡COPIADO!' : 'COPIAR CORREO'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Monto Pagado</label>
                                    <input 
                                        type="number" placeholder="Ej: 30000" required
                                        value={monto} onChange={(e) => setMonto(e.target.value)}
                                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Referencia / Celular</label>
                                    <input 
                                        type="text" placeholder="Número de comprobante" required
                                        value={referencia} onChange={(e) => setReferencia(e.target.value)}
                                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

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

export default function ReportarPago() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando formulario de reporte...</div>}>
            <ReportarPagoForm />
        </Suspense>
    );
}
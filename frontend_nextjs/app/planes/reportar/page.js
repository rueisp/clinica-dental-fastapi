'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, authFetch } from '@/config/api';
import { Upload, CheckCircle, CreditCard, ArrowLeft, Copy, Check, Zap } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';


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

    // Moneda seleccionada en el catálogo (COP o USD)
    const moneda = searchParams.get('moneda') || 'COP';

    // Datos oficiales de recaudo
    const cuentaColombia = "3147953756";
    const binanceUID = "281180273";
    const textoRemesa = "Banco: Nequi / Bancolombia\nTitular: Rueis Pitre\nCédula: 1235250806\nCelular: +57 3147953756";

    // Estados de confirmación de copiado
    const [copiadoColombia, setCopiadoColombia] = useState(false);
    const [copiadoBinance, setCopiadoBinance] = useState(false);
    const [copiadoRemesa, setCopiadoRemesa] = useState(false);

    const copiarAlPortapapeles = (texto, setEstado) => {
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setEstado(true);
            setTimeout(() => setEstado(false), 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
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

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                setEnviado(true);
                setTimeout(() => router.replace('/dashboard'), 3000);
            } else {
                const errorMsg = typeof data.detail === 'string'
                    ? data.detail
                    : (Array.isArray(data.detail) ? data.detail[0]?.msg : 'No se pudo procesar el reporte de pago.');
                alert(`⚠️ ${errorMsg}`);
            }
        } catch (err) {
            alert("Error de conexión al enviar el reporte. Por favor, verifica tu red.");
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

    // Definición de las 3 tarjetas de pago
    const tarjetaColombia = (
        <div key="colombia" className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
            <div className="space-y-1">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span>💵</span> Nequi / Bancolombia / Llave Bre-B (Colombia)
                </h3>
                <p className="text-xs text-gray-500">
                    Transfiere sin comisiones desde cualquier banco o billetera colombiana al número:
                </p>
                <p className="text-sm text-green-700 font-mono font-bold pt-1">{cuentaColombia}</p>
            </div>
            <button
                type="button"
                onClick={() => copiarAlPortapapeles(cuentaColombia, setCopiadoColombia)}
                className={`sm:self-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shrink-0 min-w-[140px] cursor-pointer ${
                    copiadoColombia 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'bg-black hover:bg-gray-800 text-white shadow-md active:scale-95'
                }`}
            >
                {copiadoColombia ? <Check size={14} /> : <Copy size={14} />}
                {copiadoColombia ? '¡COPIADO!' : 'COPIAR NÚMERO'}
            </button>
        </div>
    );

    const tarjetaBinance = (
        <div key="binance" className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
            <div className="space-y-1">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    🪙 Binance Pay (USDT / Dólar Digital - 0% Comisión)
                </h3>
                <p className="text-xs text-gray-500">
                    Envía en USDT instantáneamente a través de Binance Pay ingresando nuestro UID:
                </p>
                <div className="pt-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Binance UID:</span>
                    <span className="text-sm text-yellow-600 font-mono font-bold">{binanceUID}</span>
                </div>
            </div>
            <button
                type="button"
                onClick={() => copiarAlPortapapeles(binanceUID, setCopiadoBinance)}
                className={`sm:self-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shrink-0 min-w-[140px] cursor-pointer ${
                    copiadoBinance 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-md active:scale-95'
                }`}
            >
                {copiadoBinance ? <Check size={14} /> : <Copy size={14} />}
                {copiadoBinance ? '¡COPIADO!' : 'COPIAR UID'}
            </button>
        </div>
    );

    const tarjetaRemesaLatAm = (
        <div key="remesa" className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-gray-50/40 transition-colors">
            <div className="space-y-2 flex-1">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    🌎 Transferencia Local desde Latinoamérica (Soles, Dólares, Pesos)
                </h3>
                <p className="text-xs text-gray-500">
                    Paga en tu moneda local usando <strong>Global66, Western Union, Remitly o Ria</strong> hacia nuestra cuenta en Colombia:
                </p>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1 text-gray-700">
                    <p>• <strong>Banco / Billetera:</strong> Nequi / Bancolombia (Colombia)</p>
                    <p>• <strong>Titular:</strong> Rueis Pitre</p>
                    <p>• <strong>Cédula de Ciudadanía:</strong> 1235250806</p>
                    <p>• <strong>Celular / Cuenta:</strong> +57 3147953756</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => copiarAlPortapapeles(textoRemesa, setCopiadoRemesa)}
                className={`sm:self-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shrink-0 min-w-[140px] cursor-pointer ${
                    copiadoRemesa 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95'
                }`}
            >
                {copiadoRemesa ? <Check size={14} /> : <Copy size={14} />}
                {copiadoRemesa ? '¡COPIADO!' : 'COPIAR DATOS'}
            </button>
        </div>
    );

    // Ordenamiento dinámico según moneda
    const listaTarjetas = moneda === 'USD' 
        ? [tarjetaBinance, tarjetaRemesaLatAm, tarjetaColombia]
        : [tarjetaColombia, tarjetaBinance, tarjetaRemesaLatAm];

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-black">
                    <ArrowLeft size={20} /> Volver
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-black p-6 text-white">
                        <h1 className="text-2xl font-bold">
                            Reportar Pago: {planNombre.replace(/_/g, ' ').toUpperCase()}
                        </h1>
                        <p className="opacity-90">Completa los datos para activar tu suscripción.</p>
                    </div>

                    <div className="p-8">
                        <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                    <CreditCard size={20} className="text-gray-600" /> Métodos de Pago Disponibles
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Realiza tu pago por el medio más cómodo para ti y reporta el comprobante abajo.
                                </p>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                                {listaTarjetas}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Monto Pagado</label>
                                    <input 
                                        type="number" step="any" placeholder="Ej: 30000 o 10" required
                                        value={monto} onChange={(e) => setMonto(e.target.value)}
                                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Referencia / Celular / Hash</label>
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
        <AuthGuard>
            <Suspense fallback={<div className="p-8 text-center">Cargando formulario de reporte...</div>}>
                <ReportarPagoForm />
            </Suspense>
        </AuthGuard>
    );
}
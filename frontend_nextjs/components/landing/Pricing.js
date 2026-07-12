'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, API_ENDPOINTS } from '@/config/api';

export default function Pricing() {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    // Nuevo estado: 'mensual' o 'anual'
    const [billingCycle, setBillingCycle] = useState('mensual');
    const [moneda, setMoneda] = useState('COP'); 
    const router = useRouter();

    useEffect(() => {
        const token = getAuthToken();
        setIsLoggedIn(!!token && token !== 'test_token_123');

        fetch(API_ENDPOINTS.PLANES)
            .then(res => res.json())
            .then(data => {
                setPlanes(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error cargando planes:", err);
                setLoading(false);
            });
    }, []);

    // Lógica de filtrado: Trial siempre se muestra, el resto depende del switch
    const planesFiltrados = planes.filter(plan => {
        if (plan.nombre === 'trial') return true;
        if (billingCycle === 'mensual') return plan.duracion_dias === 30;
        if (billingCycle === 'anual') return plan.duracion_dias === 365;
        return false;
    }).sort((a, b) => a.orden - b.orden);

    const handlePlanClick = (plan) => {
        if (isLoggedIn) {
            // Si ya está logueado, lo mandamos a reportar el pago directamente con la moneda seleccionada
            router.push(`/planes/reportar?plan_id=${plan.id}&plan_nombre=${plan.nombre}&moneda=${moneda}`);
        } else {
            // Si no, lo mandamos a registrarse primero
            router.push(`/registro?plan_id=${plan.id}&moneda=${moneda}`);
        }
    };

    if (loading) return <div className="text-center py-10">Cargando planes...</div>;

    return (
        <section id="precios" className="py-20 bg-gray-50">
            <div className="container mx-auto px-4 text-center">
                <h3 className="text-3xl font-bold mb-8">Planes que se adaptan a ti</h3>

                {/* --- SWITCH DE MONEDA --- */}
                <div className="flex justify-center items-center mb-4">
                    <div className="bg-gray-200 p-1 rounded-full flex items-center shadow-inner inline-flex">
                        <button
                            onClick={() => setMoneda('COP')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                moneda === 'COP' 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            COP ($)
                        </button>
                        <button
                            onClick={() => setMoneda('USD')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                moneda === 'USD' 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            USD ($)
                        </button>
                    </div>
                </div>

                {/* Switch de Facturación tipo Google One */}
                <div className="flex justify-center items-center mb-12">
                    <div className="bg-gray-200 p-1 rounded-full flex items-center shadow-inner inline-flex">
                        <button
                            onClick={() => setBillingCycle('mensual')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                billingCycle === 'mensual' 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setBillingCycle('anual')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                billingCycle === 'anual' 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Anual
                            <span className="ml-2 text-xs text-green-600 font-bold">Ahorra 16%</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    {planesFiltrados.map((plan) => (
                        <div key={plan.id} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:border-purple-500 transition-all flex flex-col">
                            <h4 className="text-xl font-bold uppercase text-purple-600 mb-4">
                                {plan.nombre.replace('_mensual', '').replace('_anual', '').replace('_', ' ')}
                            </h4>
                            {/* --- REEMPLACE ESTE BLOQUE DESDE AQUÍ --- */}
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">
                                        {plan.precio_cop === 0 
                                            ? 'Gratis' 
                                            : moneda === 'COP' 
                                                ? `$${plan.precio_cop.toLocaleString('es-CO')}` 
                                                : `$${plan.precio_mensual} USD`
                                        }
                                    </span>
                                    <span className="text-gray-500"> / {plan.duracion_dias === 365 ? 'año' : plan.duracion_dias === 7 ? '7 días' : 'mes'}</span>
                                    {plan.duracion_dias === 365 && (
                                        <p className="text-xs text-green-600 mt-1 font-semibold italic">
                                            Pago único anual
                                        </p>
                                    )}
                                </div>
                                {/* --- HASTA AQUÍ --- */}
                            
                            <ul className="space-y-3 mb-8 flex-grow text-sm">
                                {/* 1. Funciones Administrativas (Para todos los planes) */}
                                <li className="flex items-center gap-2 text-gray-700">
                                    <span className="text-green-500">✅</span> <strong>{plan.limite_pacientes_diario}</strong> pacientes / día
                                </li>
                                
                                {/* 2. FUNCIÓN RESALTADA: Recibos Rápidos (Para todos los planes) */}
                                <li className="flex items-center gap-2 text-gray-700">
                                    <span className="text-blue-500">🧾</span> Generar recibos de cobro rápido
                                </li>

                                {/* 3. FUNCIÓN RESALTADA: Exportar Word (Básico, Pro y Trial) */}
                                <li className={`flex items-center gap-2 ${plan.can_export_history ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                                    <span>{plan.can_export_history ? '📝' : '❌'}</span> 
                                    Exportar historia a Word {!plan.can_export_history && "(PRO)"}
                                </li>

                                {/* 4. Funciones Clínicas Avanzadas (Solo Pro y Trial) */}
                                <li className={`flex items-center gap-2 ${plan.can_use_odontogram ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                                    <span>{plan.can_use_odontogram ? '🦷' : '🔒'}</span> 
                                    Odontograma Digital {!plan.can_use_odontogram && "(PRO)"}
                                </li>

                                <li className={`flex items-center gap-2 ${plan.can_use_voice ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                                    <span>{plan.can_use_voice ? '🎙️' : '🔒'}</span> 
                                    Evolución por voz {!plan.can_use_voice && "(PRO)"}
                                </li>

                                <li className={`flex items-center gap-2 ${plan.can_use_multimedia ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                                    <span>{plan.can_use_multimedia ? '📸' : '🔒'}</span> 
                                    Multimedia (Fotos y RX) {!plan.can_use_multimedia && "(PRO)"}
                                </li>
                            </ul>

                            <button 
                                onClick={() => handlePlanClick(plan)}
                                className="w-full text-center bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors mt-auto"
                            >
                                {plan.precio_cop === 0 ? 'Probar Gratis' : (isLoggedIn ? 'Ver Plan' : 'Elegir Plan')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
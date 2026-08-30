'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, API_ENDPOINTS } from '@/config/api';

export default function Pricing() {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
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

    const planesFiltrados = planes.filter(plan => {
        if (plan.nombre === 'trial') return true;
        if (billingCycle === 'mensual') return plan.duracion_dias === 30;
        if (billingCycle === 'anual') return plan.duracion_dias === 365;
        return false;
    }).sort((a, b) => a.orden - b.orden);

    const handlePlanClick = (plan) => {
        if (isLoggedIn) {
            router.push(`/planes/reportar?plan_id=${plan.id}&plan_nombre=${plan.nombre}&moneda=${moneda}`);
        } else {
            router.push(`/registro?plan_id=${plan.id}&moneda=${moneda}`);
        }
    };

    if (loading) return <div className="text-center py-10">Cargando planes...</div>;

    return (
        <section id="precios" className="py-20 bg-gray-50">
            <div className="container mx-auto px-4 text-center">
                <h3 className="text-3xl font-bold mb-8">Planes que se adaptan a tu consultorio</h3>

                {/* Switch de Moneda */}
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

                {/* Switch de Facturación Mensual / Anual */}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-6xl mx-auto">
                    {planesFiltrados.map((plan) => {
                        const esProOTrial = plan.nombre === 'trial' || plan.nombre.includes('pro');

                        return (
                            <div 
                                key={plan.id} 
                                className={`bg-white p-8 rounded-3xl shadow-lg border transition-all flex flex-col ${
                                    esProOTrial && plan.nombre !== 'trial'
                                        ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-purple-50' 
                                        : 'border-gray-100'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xl font-bold uppercase text-purple-600">
                                        {plan.nombre.replace('_mensual', '').replace('_anual', '').replace('_', ' ')}
                                    </h4>
                                    {plan.nombre === 'trial' && (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                                            7 Días Full
                                        </span>
                                    )}
                                    {plan.nombre.includes('pro') && (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                                            Recomendado
                                        </span>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <span className="text-4xl font-black text-gray-900">
                                        {plan.precio_cop === 0 
                                            ? 'Gratis' 
                                            : moneda === 'COP' 
                                                ? `$${plan.precio_cop.toLocaleString('es-CO')}` 
                                                : `$${plan.precio_mensual} USD`
                                        }
                                    </span>
                                    <span className="text-gray-500 text-sm font-medium">
                                        {' '} / {plan.duracion_dias === 365 ? 'año' : plan.duracion_dias === 7 ? '7 días' : 'mes'}
                                    </span>
                                    {plan.duracion_dias === 365 && (
                                        <p className="text-xs text-green-600 mt-1 font-bold">
                                            ✓ Facturación única anual con descuento
                                        </p>
                                    )}
                                </div>
                                
                                <ul className="space-y-3 mb-8 flex-grow text-sm">
                                    {/* 🤖 FUNCIÓN ESTRELLA: Bot de WhatsApp con IA */}
                                    <li className={`flex items-center gap-2 font-bold ${esProOTrial ? 'text-green-700 bg-green-50/50 p-2 rounded-xl border border-green-100' : 'text-gray-400 italic'}`}>
                                        <span>{esProOTrial ? '🤖' : '🔒'}</span> 
                                        <span>Asistente WhatsApp IA 24/7 {!esProOTrial && '(PRO)'}</span>
                                    </li>

                                    {/* ⚙️ FUNCIÓN ESTRELLA: Personalización de Tarifas y Horarios */}
                                    <li className={`flex items-center gap-2 ${esProOTrial ? 'text-gray-800 font-semibold' : 'text-gray-400 italic'}`}>
                                        <span>{esProOTrial ? '⚙️' : '🔒'}</span> 
                                        <span>Catálogo de tarifas COP y horarios propios {!esProOTrial && '(PRO)'}</span>
                                    </li>

                                    {/* Límite de Pacientes */}
                                    <li className="flex items-center gap-2 text-gray-700">
                                        <span className="text-green-500">✅</span> 
                                        <span><strong>{plan.limite_pacientes_diario}</strong> pacientes / día</span>
                                    </li>
                                    
                                    {/* Recibos Rápidos */}
                                    <li className="flex items-center gap-2 text-gray-700">
                                        <span className="text-blue-500">🧾</span> 
                                        <span>Generar recibos rápidos para WhatsApp</span>
                                    </li>

                                    {/* Exportar Word */}
                                    <li className={`flex items-center gap-2 ${plan.can_export_history ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                                        <span>{plan.can_export_history ? '📝' : '❌'}</span> 
                                        <span>Exportar historia a Word</span>
                                    </li>

                                    {/* Odontograma */}
                                    <li className={`flex items-center gap-2 ${plan.can_use_odontogram ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                                        <span>{plan.can_use_odontogram ? '🦷' : '🔒'}</span> 
                                        <span>Odontograma Digital {!plan.can_use_odontogram && '(PRO)'}</span>
                                    </li>

                                    {/* Evolución por Voz */}
                                    <li className={`flex items-center gap-2 ${plan.can_use_voice ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                                        <span>{plan.can_use_voice ? '🎙️' : '🔒'}</span> 
                                        <span>Evolución por voz {!plan.can_use_voice && '(PRO)'}</span>
                                    </li>

                                    {/* Multimedia */}
                                    <li className={`flex items-center gap-2 ${plan.can_use_multimedia ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                                        <span>{plan.can_use_multimedia ? '📸' : '🔒'}</span> 
                                        <span>Fotos y Rx en la nube {!plan.can_use_multimedia && '(PRO)'}</span>
                                    </li>
                                </ul>

                                <button 
                                    onClick={() => handlePlanClick(plan)}
                                    className={`w-full text-center py-3.5 rounded-2xl font-bold transition-all shadow-md mt-auto cursor-pointer ${
                                        esProOTrial && plan.nombre !== 'trial'
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200' 
                                            : 'bg-black hover:bg-gray-800 text-white'
                                    }`}
                                >
                                    {plan.precio_cop === 0 ? 'Comenzar Prueba Gratis (7 Días)' : (isLoggedIn ? 'Solicitar Plan' : 'Elegir Plan')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
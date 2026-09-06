'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, API_BASE_URL } from '@/config/api';
import { Calendar, Users, TrendingUp, CreditCard } from 'lucide-react';

export default function PlanesPage() {
  const [planActual, setPlanActual] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moneda, setMoneda] = useState('COP'); 
  const [billingCycle, setBillingCycle] = useState('mensual'); // <--- AGREGAR ESTA LÍNEA
  const router = useRouter();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar plan actual
      const resPlan = await authFetch(`${API_BASE_URL}/api/usuarios/mi-plan-detalle`);
      if (resPlan.ok) {
        const data = await resPlan.json();
        setPlanActual(data);
        if (data.permissions) {
          localStorage.setItem('user_permissions', JSON.stringify(data.permissions));
        }
      }

      // Cargar todos los planes
      const resPlanes = await fetch(`${API_BASE_URL}/api/planes/`);
      const planesData = await resPlanes.json();
      setPlanes(planesData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarPlan = async (plan) => {
    // --- ASEGÚRESE DE QUE ESTA DEFINICIÓN ESTÉ AQUÍ ---
    const precioMostrar = moneda === 'COP'
      ? `$${plan.precio_cop.toLocaleString('es-CO')} COP`
      : `$${plan.precio_mensual} USD`;
    // Alerta de confirmación detallada para evitar errores
    const mensajeConfirmar = plan.precio_cop > 0 
      ? `⚠️ ATENCIÓN: Estás a punto de solicitar el plan "${plan.nombre.replace('_', ' ').toUpperCase()}".\n\n` +
        `• Valor: ${precioMostrar}\n` +
        `• Duración: ${plan.duracion_dias === 365 ? '1 Año' : '1 Mes'}\n\n` +
        `Para activar este plan, el sistema te redirigirá para que realices tu pago en línea (Bold/PayPal).\n\n` +
        `¿Estás seguro de que deseas continuar con esta solicitud?`
      : `¿Confirmas que deseas activar el plan gratuito "${plan.nombre.toUpperCase()}"?`;

    if (!confirm(mensajeConfirmar)) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/usuarios/cambiar-plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan_nombre: plan.nombre })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === 'pending_payment') {
          // AQUÍ ESTÁ EL CAMBIO: Si está pendiente, obligamos a ir a reportar
          alert('Solicitud registrada. Por favor, procede a adjuntar el comprobante de pago.');
          router.push(`/planes/reportar?plan_id=${plan.id}&plan_nombre=${plan.nombre}&moneda=${moneda}`);
        } else {
          alert('✅ Plan Trial activado correctamente');
          router.push('/dashboard');
        }
      } else {
        alert('Error: ' + data.detail);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  const getColorByDias = (dias) => {
    if (dias <= 0) return 'text-red-600';
    if (dias <= 7) return 'text-orange-600';
    return 'text-green-600';
  };

  // Filtrar planes según el ciclo seleccionado (Mensual o Anual)
  const planesFiltrados = planes.filter(plan => {
    if (plan.nombre === 'trial') return true;
    if (billingCycle === 'mensual') return plan.duracion_dias === 30;
    if (billingCycle === 'anual') return plan.duracion_dias === 365;
    return false;
  }).sort((a, b) => a.orden - b.orden);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Tarjeta del plan actual */}
      {planActual && planActual.tiene_plan && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="border-l-4 border-blue-500 pl-4 mb-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tu plan actual</p>
            {/* CAMBIO 1: Nombre limpio y con formato elegante */}
            <h3 className="text-2xl font-black text-gray-900 capitalize">
              {planActual.plan_nombre?.replace('_', ' ')}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-400">Límite diario</p>
                <p className="font-bold">{planActual.limite_pacientes_diario} pacientes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-400">Valor</p>
                <p className="font-bold">
                  {moneda === 'COP'
                    ? `$${planActual.plan_precio.toLocaleString('es-CO')}`
                    : `$${planActual.plan_precio_usd || 0} USD`
                  }
                  {planActual.es_anual ? '/año' : '/mes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-400">Días restantes</p>
                <p className={`font-bold ${getColorByDias(planActual.dias_restantes)}`}>
                  {planActual.dias_restantes} días
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-400">Ciclo</p>
                <p className="font-bold text-xs">{planActual.fecha_inicio} → {planActual.fecha_fin}</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progreso</span>
              <span className="text-blue-600 font-bold">{planActual.porcentaje_progreso}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-500 rounded-full h-2" style={{ width: `${planActual.porcentaje_progreso}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Cabecera de Planes Disponibles con Switch de Moneda y Ciclo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Planes disponibles</h2>
          <p className="text-xs text-gray-500 font-medium">Elige el plan ideal o mejora tu suscripción actual.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Switch Mensual / Anual */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle('mensual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'mensual' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('anual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'anual' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Anual <span className="text-[10px] text-green-600 font-black ml-1">Ahorra 16%</span>
            </button>
          </div>

          {/* Switch de Moneda COP / USD */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => setMoneda('COP')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                moneda === 'COP' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              COP ($)
            </button>
            <button
              type="button"
              onClick={() => setMoneda('USD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                moneda === 'USD' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>
      {/* Cuadrícula adaptada a 4 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planesFiltrados.map((plan) => {
          const esPlanActual = planActual?.plan_nombre === plan.nombre;
          const estaPendiente = planActual?.status === 'pending_payment' && esPlanActual;
          const planVencido = !planActual?.dias_restantes || planActual?.dias_restantes <= 0 || planActual?.status !== 'active';
          
          // Es un upgrade si el plan destino cuesta más que el plan actual del doctor
          const esMejora = !esPlanActual && !planVencido && plan.precio_cop > (planActual?.plan_precio || 0);

          return (
            <div key={plan.id} className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between ${
              plan.nombre.includes('ultra') ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'
            }`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-black text-gray-900 capitalize">
                    {plan.nombre.replace('_mensual', '').replace('_anual', '').replace('_', ' ')}
                  </h3>
                  {plan.nombre.includes('ultra') && (
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-purple-100">
                      Top
                    </span>
                  )}
                </div>
                
                <p className="text-2xl font-black text-blue-600 mb-4">
                  {plan.precio_cop === 0 
                    ? 'Gratis' 
                    : moneda === 'COP'
                      ? `$${plan.precio_cop.toLocaleString('es-CO')}`
                      : `$${plan.precio_mensual} USD`
                  }
                  <span className="text-xs text-gray-500 font-normal">
                    {plan.duracion_dias === 365 ? '/año' : plan.duracion_dias === 7 ? '/7 días' : '/mes'}
                  </span>
                </p>

                <ul className="space-y-2.5 mb-6 text-xs">
                  {/* Asistente de WhatsApp */}
                  <li className={`flex items-center gap-2 font-bold ${(plan.nombre === 'trial' || plan.nombre.includes('ultra')) ? 'text-green-700 bg-green-50 p-2 rounded-xl border border-green-100' : 'text-gray-400 italic'}`}>
                    <span>{(plan.nombre === 'trial' || plan.nombre.includes('ultra')) ? '🤖' : '🔒'}</span> 
                    <span>Asistente WhatsApp IA 24/7 {!(plan.nombre === 'trial' || plan.nombre.includes('ultra')) && '(ULTRA)'}</span>
                  </li>

                  {/* Personalización de Respuestas */}
                  <li className={`flex items-center gap-2 ${(plan.nombre === 'trial' || plan.nombre.includes('ultra')) ? 'text-gray-800 font-semibold' : 'text-gray-400 italic'}`}>
                    <span>{(plan.nombre === 'trial' || plan.nombre.includes('ultra')) ? '⚙️' : '🔒'}</span> 
                    <span>Personaliza respuestas automáticas del Bot WhatsApp {!(plan.nombre === 'trial' || plan.nombre.includes('ultra')) && '(ULTRA)'}</span>
                  </li>

                  <li className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500">✅</span> 
                    <span><strong>{plan.limite_pacientes_diario}</strong> pacientes / día</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <span>🧾</span> 
                    <span>Generar recibos rápidos WhatsApp</span>
                  </li>
                  <li className={`flex items-center gap-2 ${plan.can_export_history ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                    <span>{plan.can_export_history ? '📝' : '❌'}</span> 
                    <span>Exportar historia a Word</span>
                  </li>
                  <li className={`flex items-center gap-2 ${plan.can_use_odontogram ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                    <span>{plan.can_use_odontogram ? '🦷' : '🔒'}</span> 
                    <span>Odontograma digital {plan.can_use_odontogram ? '' : '(PRO)'}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${plan.can_use_voice ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                    <span>{plan.can_use_voice ? '🎙️' : '🔒'}</span> 
                    <span>Evolución por voz {plan.can_use_voice ? '' : '(PRO)'}</span>
                  </li>
                </ul>
              </div>

              {/* 🔘 LÓGICA DE BOTONES DINÁMICOS */}
              <div className="pt-2">
                {estaPendiente ? (
                  <button disabled className="w-full bg-yellow-100 text-yellow-700 py-2.5 rounded-xl font-bold text-xs cursor-default flex items-center justify-center gap-2">
                    ⏳ Pago en verificación
                  </button>
                ) : esPlanActual && !planVencido ? (
                  <button disabled className="w-full bg-green-100 text-green-700 py-2.5 rounded-xl font-bold text-xs cursor-not-allowed">
                    ✅ Plan actual (Activo)
                  </button>
                ) : esPlanActual && planVencido ? (
                  <button
                    onClick={() => handleCambiarPlan(plan)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-md cursor-pointer"
                  >
                    🔄 Renovar este plan
                  </button>
                ) : esMejora ? (
                  /* BOTÓN DE UPGRADE ACTIVO */
                  <button
                    onClick={() => handleCambiarPlan(plan)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-purple-100 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🚀 Mejorar a este plan</span>
                  </button>
                ) : !esPlanActual && !planVencido && planActual?.plan_nombre?.toLowerCase() !== 'trial' ? (
                  <button 
                    disabled 
                    className="w-full bg-gray-100 text-gray-400 py-2.5 rounded-xl font-bold text-xs cursor-not-allowed"
                  >
                    🔒 Suscripción Activa
                  </button>
                ) : (
                  <button
                    onClick={() => handleCambiarPlan(plan)}
                    className="w-full bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800 transition cursor-pointer"
                  >
                    {plan.precio_cop === 0 ? 'Activar plan' : 'Seleccionar este plan'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
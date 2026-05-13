'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, API_BASE_URL } from '@/config/api';
import { Calendar, Users, TrendingUp, CreditCard } from 'lucide-react';

export default function PlanesPage() {
  const [planActual, setPlanActual] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
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
      }

      // Cargar todos los planes
      const resPlanes = await fetch(`${API_BASE_URL}/api/planes`);
      const planesData = await resPlanes.json();
      setPlanes(planesData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarPlan = async (plan) => {
    const mensajeConfirmar = plan.precio_cop > 0 
      ? `Para activar el plan ${plan.nombre} deberás subir un comprobante de pago. ¿Deseas continuar?`
      : `¿Confirmas activar el plan ${plan.nombre}?`;

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
          router.push(`/planes/reportar?plan_id=${plan.id}&plan_nombre=${plan.nombre}`);
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Tarjeta del plan actual */}
      {planActual && planActual.tiene_plan && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="border-l-4 border-blue-500 pl-4 mb-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tu plan actual</p>
            <h3 className="text-2xl font-bold text-gray-900">{planActual.plan_nombre}</h3>
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
                <p className="font-bold">${planActual.plan_precio.toLocaleString('es-CO')}/mes</p>
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

      {/* Lista de planes disponibles */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Planes disponibles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planes.map((plan) => {
          const esPlanActual = planActual?.plan_nombre === plan.nombre;
          
          return (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.nombre}</h3>
              <p className="text-3xl font-bold text-blue-600 mb-4">
                {plan.precio_cop === 0 ? 'Gratis' : `$${plan.precio_cop.toLocaleString('es-CO')}`}
                <span className="text-sm text-gray-500 font-normal">
                  {plan.duracion_dias === 365 ? '/año' : '/mes'}
                </span>
              </p>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li>✅ {plan.limite_pacientes_diario} pacientes/día</li>
                <li>✅ Odontograma digital</li>
                <li>✅ Evolución por voz</li>
                <li>✅ Agenda de citas</li>
              </ul>
              {esPlanActual ? (
                <button disabled className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg font-bold cursor-not-allowed">
                  ✅ Plan actual
                </button>
              ) : (
                <button
                  onClick={() => handleCambiarPlan(plan)}
                  className="w-full bg-black text-white py-2 rounded-lg font-bold hover:bg-gray-800 transition"
                >
                  {plan.precio_cop === 0 ? 'Activar plan' : 'Cambiar a este plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
'use client';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';

export default function PlanAlerta() {
  const { user, loading } = useUser();
  const router = useRouter();

  // Si el contexto carga, no hay plan, o el usuario es administrador, ocultamos la alerta
  if (loading || !user?.plan_info || user?.is_admin) return null;

  const { dias_restantes, nombre: planNombreRaw, es_anual, status } = user.plan_info;
  const planNombre = (planNombreRaw || 'Profesional').replace(/_/g, ' ');

  // Si el doctor ya reportó el pago y está pendiente de aprobación por el admin
  if (status === 'pending_payment') {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Clock className="text-blue-600" size={24} />
          <div className="flex-1">
            <p className="font-bold text-blue-800 uppercase text-[10px] tracking-widest">⏳ Pago en Verificación</p>
            <p className="text-sm text-blue-700">
              Hemos recibido tu reporte de pago para el plan <strong className="capitalize">{planNombre}</strong>. El administrador activará tu acceso a la brevedad.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Lógica de aviso: 15 días para anuales, 3 días para el resto
  const diasParaAvisar = es_anual ? 15 : 3;

  // Si le quedan más días de los permitidos para avisar, ocultamos la alerta
  if (dias_restantes > diasParaAvisar) return null;

  // Plan Expirado
  if (dias_restantes <= 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4 animate-pulse">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={24} />
          <div className="flex-1">
            <p className="font-bold text-red-800 uppercase text-[10px] tracking-widest">⚠️ Plan Expirado</p>
            <p className="text-sm text-red-700">
              Tu plan <strong className="capitalize">{planNombre}</strong> ha vencido. Renueva para seguir usando el sistema.
            </p>
          </div>
          <button
            onClick={() => router.push('/planes')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            Renovar
          </button>
        </div>
      </div>
    );
  }

  // Renovación Próxima (3 días o menos, o 15 para anuales)
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Calendar className="text-yellow-600" size={24} />
        <div className="flex-1">
          <p className="font-bold text-yellow-800 uppercase text-[10px] tracking-widest">⚠️ Renovación Próxima</p>
          <p className="text-sm text-yellow-700">
            Quedan <span className="font-bold">{dias_restantes} {dias_restantes === 1 ? 'día' : 'días'}</span> de tu plan <strong className="capitalize">{planNombre}</strong>.
          </p>
        </div>
        <button
          onClick={() => router.push('/planes')}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-700 transition-colors cursor-pointer"
        >
          {es_anual ? 'Gestionar Anualidad' : 'Renovar'}
        </button>
      </div>
    </div>
  );
}
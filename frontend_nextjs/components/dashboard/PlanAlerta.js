'use client';
import { useUser } from '@/context/UserContext'; // <--- 1. Importamos el contexto
import { useRouter } from 'next/navigation';
import { AlertTriangle, Calendar } from 'lucide-react';

export default function PlanAlerta() {
  const { user, loading } = useUser(); // <--- 2. Consumimos los datos globales
  const router = useRouter();

  // 3. CAMBIO: Si el contexto carga o no hay plan, no mostramos nada
  if (loading || !user?.plan_info) return null;

  // 4. CAMBIO: Extraemos las variables directamente del objeto global
  const { dias_restantes, nombre: planNombre, es_anual } = user.plan_info;
  
  // Lógica de aviso: 15 días para anuales, 3 días para el resto
  const diasParaAvisar = es_anual ? 15 : 3;

  // Si le quedan más días de los permitidos para avisar, ocultamos la alerta
  if (dias_restantes > diasParaAvisar) return null;

  // 5. El resto del JSX usa las variables extraídas arriba:
  if (dias_restantes <= 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4 animate-pulse">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={24} />
          <div className="flex-1">
            <p className="font-bold text-red-800 uppercase text-[10px] tracking-widest">⚠️ Plan Expirado</p>
            <p className="text-sm text-red-700">
              Tu plan <strong>{planNombre}</strong> ha vencido. Renueva para seguir usando el sistema.
            </p>
          </div>
          <button
            onClick={() => router.push('/planes')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Renovar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Calendar className="text-yellow-600" size={24} />
        <div className="flex-1">
          <p className="font-bold text-yellow-800 uppercase text-[10px] tracking-widest">⚠️ Renovación Próxima</p>
          <p className="text-sm text-red-700">
            Quedan <span className="font-bold">{dias_restantes} {dias_restantes === 1 ? 'día' : 'días'}</span> de tu {planNombre}.
          </p>
        </div>
        <button
          onClick={() => router.push('/planes')}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-700 transition-colors"
        >
          {es_anual ? 'Gestionar Anualidad' : 'Renovar'}
        </button>
      </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, API_BASE_URL } from '@/config/api';
import { AlertTriangle, Calendar } from 'lucide-react';

export default function PlanAlerta() {
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [planNombre, setPlanNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarAlerta = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/usuarios/mi-plan-detalle`);
        if (res.ok) {
          const data = await res.json();
          if (data.tiene_plan) {
            setDiasRestantes(data.dias_restantes);
            setPlanNombre(data.plan_nombre);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarAlerta();
  }, []);

  if (loading) return null;
  if (diasRestantes === null || diasRestantes > 3) return null;

  if (diasRestantes <= 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={24} />
          <div className="flex-1">
            <p className="font-bold text-red-800">⚠️ Plan Vencido</p>
            <p className="text-sm text-red-700">
              Tu plan {planNombre} ha vencido. Renueva para seguir usando el sistema.
            </p>
          </div>
          <button
            onClick={() => router.push('/planes')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
          >
            Renovar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <Calendar className="text-yellow-600" size={24} />
        <div className="flex-1">
          <p className="font-bold text-yellow-800">⚠️ Tu plan está por vencer</p>
          <p className="text-sm text-yellow-700">
            Quedan <span className="font-bold">{diasRestantes}</span> días de tu plan {planNombre}.
          </p>
        </div>
        <button
          onClick={() => router.push('/planes')}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          Renovar
        </button>
      </div>
    </div>
  );
}
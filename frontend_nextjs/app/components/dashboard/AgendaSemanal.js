'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, User } from 'lucide-react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import { formatearFechaLocal } from '@/app/utils/fechas';

export default function AgendaSemanal({ fechaInicio, onSeleccionarDia }) {
  const [dias, setDias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generarSemana();
  }, [fechaInicio]);

  const generarSemana = async () => {
    setLoading(true);
    const listaDias = [];
    const fechaBase = new Date(fechaInicio + 'T00:00:00');

    // Generamos los 7 días
    for (let i = 0; i < 7; i++) {
      const d = new Date(fechaBase);
      d.setDate(d.getDate() + i);
      const fechaStr = formatearFechaLocal(d);
      
      listaDias.push({
        fecha: fechaStr,
        nombreDia: d.toLocaleDateString('es-ES', { weekday: 'long' }),
        numeroDia: d.getDate(),
        mes: d.toLocaleDateString('es-ES', { month: 'short' }),
        citas: [] // Se llenará con la API
      });
    }

    // Para hacerlo óptimo, consultamos las citas de esos días
    // Nota: Si tienes un endpoint de rango úsalo, si no, lo simulamos con los eventos ya cargados
    setDias(listaDias);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      {dias.map((dia) => (
        <button
          key={dia.fecha}
          onClick={() => onSeleccionarDia(dia.fecha)}
          className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            {/* Calendario Icon Style */}
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-2 min-w-[60px] group-hover:bg-blue-50 transition-colors">
              <span className="text-[10px] uppercase font-bold text-gray-400 group-hover:text-blue-400">{dia.nombreDia.substring(0, 3)}</span>
              <span className="text-xl font-black text-gray-900 group-hover:text-blue-600">{dia.numeroDia}</span>
            </div>

            <div className="text-left">
              <h3 className="font-bold text-gray-900 capitalize">{dia.nombreDia}</h3>
              <p className="text-sm text-gray-500 capitalize">{dia.mes}, {dia.fecha.split('-')[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-gray-600 text-sm font-medium">
              <User size={14} />
              <span>Ver agenda</span>
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
}
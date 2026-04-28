'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch, API_BASE_URL } from '@/config/api';
import { Printer, ArrowLeft, MessageCircle, CheckCircle } from 'lucide-react';

export default function ReciboDetalle() {
  const { codigo } = useParams();
  const router = useRouter();
  const [pago, setPago] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPago = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/pagos/codigo/${codigo}`);
        if (res.ok) {
          const data = await res.json();
          setPago(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPago();
  }, [codigo]);

  if (loading) return <div className="p-10 text-center">Cargando recibo...</div>;
  if (!pago) return <div className="p-10 text-center text-red-500">Recibo no encontrado</div>;

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const enviarWhatsApp = () => {
    const urlRecibo = window.location.href;
    const mensaje = `🧾 *RECIBO DE PAGO - CLÍNICA DENTAL*%0A%0A*Código:* ${pago.codigo}%0A*Paciente:* ${pago.paciente_nombre}%0A*Monto:* ${formatearMoneda(pago.monto)}%0A%0A📎 *Ver recibo detallado aquí:* ${urlRecibo}`;
    const tel = pago.telefono?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/57${tel}?text=${mensaje}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      {/* Botones de acción (No se imprimen) */}
      <div className="max-w-md mx-auto mb-6 flex justify-between print:hidden">
        <button onClick={() => router.push('/')} className="text-gray-600 flex items-center gap-2">
          <ArrowLeft size={20} /> Dashboard
        </button>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="p-2 bg-white rounded-full shadow-md text-gray-600">
            <Printer size={20} />
          </button>
          <button onClick={enviarWhatsApp} className="p-2 bg-green-500 rounded-full shadow-md text-white">
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      {/* El Recibo Fisico - Bordes redondeados aplicados aquí */}
      <div className="max-w-md mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-gray-200 print:shadow-none print:border-none">
        
        {/* Cabecera Negra */}
        <div className="bg-black p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          
          <h1 className="text-xl font-bold tracking-tight">PAGO EXITOSO</h1>
          
          {/* Código Arriba, Fecha y Hora Debajo (Centrado) */}
          <div className="flex flex-col items-center mt-4 space-y-1">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] font-medium">
              {pago.codigo}
            </p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">
              {new Date(pago.fecha).toLocaleDateString('es-CO')} 
              <span className="mx-2 text-gray-600">•</span>
              {pago.hora ? pago.hora.substring(0, 5) : ''}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Paciente (Ancho completo) */}
          <div className="border-b pb-4 border-dashed">
            <p className="text-xs font-bold text-gray-400 uppercase">Paciente</p>
            <p className="text-lg font-bold text-black leading-tight break-words uppercase">
              {pago.paciente_nombre}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase">Descripción</span>
              <span className="text-xs font-bold text-black uppercase">{pago.descripcion}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase">Método de Pago</span>
              <span className="text-xs font-bold text-black uppercase">{pago.metodo_pago}</span>
            </div>

            {/* Observación: Solo si existe */}
            {pago.observacion && pago.observacion.trim() !== "" && (
              <div className="flex justify-between items-start gap-4 border-t border-gray-50 pt-2">
                <span className="text-xs font-bold text-gray-400 uppercase shrink-0">Observación</span>
                <span className="text-xs font-bold text-black uppercase text-right leading-tight">
                  {pago.observacion}
                </span>
              </div>
            )}
          </div>

          {/* Caja de Total */}
          <div className="bg-gray-50 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Pagado</p>
            <p className="text-4xl font-black text-black">{formatearMoneda(pago.monto)}</p>
          </div>

          <div className="text-center pt-4">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              Odontología Dr. Rueis Pitre - 3233316976
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch, API_BASE_URL } from '@/config/api';
import { Printer, MessageCircle, CheckCircle, LayoutDashboard } from 'lucide-react';

export default function ReciboDetalle() {
  const { codigo } = useParams();
  const router = useRouter();
  const [pago, setPago] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const fetchPago = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/pagos/codigo/${codigo}`);
        if (res.ok) {
          const data = await res.json();
          setPago(data);
        }
      } catch (err) {
        console.error("Error al cargar el recibo:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPago();
  }, [codigo]);

  if (loading) return <div className="p-10 text-center font-sans">Cargando recibo...</div>;
  if (!pago) return <div className="p-10 text-center text-red-500 font-sans">Recibo no encontrado</div>;

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const enviarWhatsApp = () => {
    const urlRecibo = window.location.href;
    const mensaje = `🧾 *RECIBO DE PAGO - DR. RUEIS PITRE*%0A%0A*Paciente:* ${pago.paciente_nombre}%0A*Monto:* ${formatearMoneda(pago.monto)}%0A*Concepto:* ${pago.descripcion}%0A%0A📎 *Ver recibo detallado:* ${urlRecibo}`;
    const tel = pago.telefono?.replace(/\D/g, '') || '';
    // Usamos el código de país 57 para Colombia
    window.open(`https://wa.me/57${tel}?text=${mensaje}`, '_blank');
  };

  return (
    <div 
      onClick={() => setShowControls(!showControls)}
      className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center relative cursor-pointer select-none"
    >
      
      {/* EL RECIBO */}
      <div className="w-full max-w-md bg-white shadow-2xl rounded-[3.5rem] overflow-hidden border border-gray-200 transition-all duration-300 print:shadow-none print:border-none print:my-0">
        
        {/* Cabecera Negra */}
        <div className="bg-black p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          
          <h1 className="text-xl font-bold tracking-tight uppercase">Pago Exitoso</h1>
          
          <div className="flex flex-col items-center mt-4 space-y-1">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] font-medium">
              {pago.codigo}
            </p>
            {/* ✅ CORRECCIÓN DE FECHA Y HORA */}
            <div className="text-gray-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span>{pago.fecha}</span> 
              <span className="text-gray-600">•</span>
              <span>{pago.hora ? pago.hora.substring(0, 5) : ''}</span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="border-b pb-4 border-dashed border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Paciente</p>
            <p className="text-lg font-bold text-black leading-tight break-words uppercase">
              {pago.paciente_nombre}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</span>
              <span className="text-xs font-bold text-black uppercase">{pago.descripcion}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Método de Pago</span>
              <span className="text-xs font-bold text-black uppercase">{pago.metodo_pago}</span>
            </div>

            {pago.observacion && (
              <div className="flex justify-between items-start gap-4 border-t border-gray-50 pt-2">
                <span className="text-xs font-bold text-gray-400 uppercase shrink-0 tracking-wider">Observación</span>
                <span className="text-xs font-bold text-black uppercase text-right leading-tight">
                  {pago.observacion}
                </span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl text-center border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Total Pagado</p>
            <p className="text-4xl font-black text-black">{formatearMoneda(pago.monto)}</p>
          </div>

          <div className="text-center pt-4">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
              Odontología Dr. Rueis Pitre - 3233316976
            </p>
          </div>
        </div>
      </div>

      {/* --- BARRA FLOTANTE DE ACCIONES --- */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 transition-all duration-500 ease-in-out z-50 print:hidden
          ${showControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95 pointer-events-none'}`}
      >
        <div className="bg-white/90 backdrop-blur-lg border border-gray-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
          
          <button onClick={() => router.push('/')} className="flex flex-col items-center gap-1 group">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-full group-hover:bg-black group-hover:text-white transition-colors">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Dashboard</span>
          </button>

          <div className="w-[1px] h-8 bg-gray-200" />

          <button onClick={enviarWhatsApp} className="flex flex-col items-center gap-1 group">
            <div className="p-2 bg-green-50 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
              <MessageCircle size={20} />
            </div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">WhatsApp</span>
          </button>

          <button onClick={() => window.print()} className="flex flex-col items-center gap-1 group">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-full group-hover:bg-black group-hover:text-white transition-colors">
              <Printer size={20} />
            </div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Imprimir</span>
          </button>

        </div>
      </div>

    </div>
  );
}
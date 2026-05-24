'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Blocks, Lock } from 'lucide-react';
import DentigramaEditor from './DentigramaEditor';
import { optimizarImagen } from '@/config/api'; // <--- Usando tu función del Repomix

export default function Dentigrama({ dentigramaCanvas, modo, onSave }) {
  const router = useRouter();
  const [canUseOdontogram, setCanUseOdontogram] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [canvasData, setCanvasData] = useState(dentigramaCanvas || '');

  useEffect(() => {
    const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}');
    const isAdmin = localStorage.getItem('is_admin') === 'true';

    if (isAdmin) {
      setCanUseOdontogram(true);
    } else if (perms.can_use_odontogram !== undefined) {
      setCanUseOdontogram(perms.can_use_odontogram);
    }
  }, []);

  const handleSave = () => {
    if (onSave) {
      onSave(canvasData);
    }
    setModalAbierto(false);
  };

  // MODO MOSTRAR (Vista previa en la ficha del paciente)
  if (modo === 'mostrar') {
    if (!dentigramaCanvas) {
      return (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <Blocks className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-medium">Sin dentigrama registrado</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div 
          className={`bg-gray-50 rounded-3xl border border-gray-100 p-4 transition-all ${
            !canUseOdontogram ? 'opacity-100' : 'cursor-pointer hover:bg-gray-100'
          }`}
          onClick={canUseOdontogram ? () => setModalAbierto(true) : () => router.push('/planes')}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Estado Dental</h3>
            
            {/* BOTÓN PRO VERDE Y CLICABLE */}
            {!canUseOdontogram && (
              <button 
                onClick={(e) => { e.stopPropagation(); router.push('/planes'); }}
                className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-black text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-green-100 cursor-pointer"
              >
                <Lock size={10} strokeWidth={3} /> PRO
              </button>
            )}
          </div>
          
          <img 
            src={optimizarImagen(dentigramaCanvas, 600)} 
            alt="Dentigrama del paciente"
            className={`w-full h-auto object-contain max-h-[200px] ${!canUseOdontogram ? 'grayscale opacity-60' : ''}`} 
          />
          <p className="text-[10px] text-zinc-400 text-center mt-4 font-black uppercase tracking-tighter">
            {canUseOdontogram ? 'Haz clic para ampliar' : 'Bloqueado en Plan Básico'}
          </p>
        </div>

        {/* MODAL DE ZOOM */}
        {modalAbierto && canUseOdontogram && (
          <div 
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setModalAbierto(false)}
          >
            <div className="relative max-w-[95vw] max-h-[90vh]">
              <img 
                src={optimizarImagen(dentigramaCanvas, 1200)} 
                alt="Dentigrama ampliado"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
              <button className="absolute -top-10 right-0 text-white font-black text-xs tracking-widest uppercase flex items-center gap-2">
                CERRAR ✕
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // MODO EDICIÓN/REGISTRO
  return (
    <>
      <div 
        className={`bg-gray-50 rounded-3xl border border-gray-100 p-6 min-h-[200px] flex items-center justify-center transition-all ${
          !canUseOdontogram ? 'grayscale opacity-40' : 'cursor-pointer hover:bg-gray-100'
        }`}
        onClick={canUseOdontogram ? () => setModalAbierto(true) : () => router.push('/planes')}
      >
        <div className="text-center relative w-full">
          {!canUseOdontogram ? (
            <div className="flex flex-col items-center">
              <div className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 mb-4 shadow-lg shadow-green-100 animate-bounce">
                <Lock size={12} strokeWidth={3} /> ACTIVAR ODONTOGRAMA PRO
              </div>
              <Blocks className="w-12 h-12 text-zinc-300 mx-auto" />
            </div>
          ) : (
            <>
              <Blocks className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400 text-xs font-black uppercase tracking-widest">
                {dentigramaCanvas ? 'Editar odontograma' : 'Crear odontograma'}
              </p>
            </>
          )}

          {dentigramaCanvas && (
            <img 
              src={optimizarImagen(dentigramaCanvas, 400)} 
              alt="Vista previa"
              className="mt-4 max-h-[120px] mx-auto object-contain opacity-50"
            />
          )}
        </div>
      </div>

      {/* Modal Editor */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-auto p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-8">Editor de Odontograma</h3>
            <div className="border-2 border-zinc-100 rounded-[2rem] p-6 bg-zinc-50/50">
              <DentigramaEditor 
                fondoUrl={dentigramaCanvas}
                onExportar={(base64) => setCanvasData(base64)}
              />
            </div>
            <div className="flex justify-end gap-4 mt-10">
              <button onClick={() => setModalAbierto(false)} className="px-8 py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-bold hover:bg-zinc-200 transition-all uppercase text-xs tracking-widest">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
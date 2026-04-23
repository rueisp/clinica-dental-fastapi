'use client';

import { useState } from 'react';
import { Blocks } from 'lucide-react';
import DentigramaEditor from './DentigramaEditor';

export default function Dentigrama({ dentigramaCanvas, modo, onSave }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [canvasData, setCanvasData] = useState(dentigramaCanvas || '');

  const handleSave = () => {
    if (onSave) {
      onSave(canvasData);
    }
    setModalAbierto(false);
  };

  // Modo mostrar (solo vista previa ampliable)
  if (modo === 'mostrar') {
    if (!dentigramaCanvas) {
      return (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <Blocks className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Sin dentigrama registrado</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div 
          className="bg-gray-50 rounded-2xl border border-gray-100 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setModalAbierto(true)}
        >
          <h3 className="text-sm font-medium text-gray-700 mb-2">Dentigrama Interactivo</h3>
          <img 
            src={dentigramaCanvas} 
            alt="Dentigrama del paciente"
            className="w-full h-auto object-contain max-h-[200px]"
          />
          <p className="text-xs text-gray-400 text-center mt-2">Haz clic para ampliar</p>
        </div>

        {modalAbierto && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setModalAbierto(false)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-lg p-4">
              <img 
                src={dentigramaCanvas} 
                alt="Dentigrama del paciente"
                className="max-w-full max-h-[85vh] object-contain"
              />
              <button 
                className="absolute top-2 right-2 bg-black text-white rounded-full w-8 h-8 flex items-center justify-center"
                onClick={() => setModalAbierto(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Modo edición/registro (se puede dibujar)
  return (
      <>
        <div 
          className="bg-gray-50 rounded-2xl border border-gray-100 p-4 cursor-pointer hover:bg-gray-100 transition-colors min-h-[200px] flex items-center justify-center"
          onClick={() => setModalAbierto(true)}
        >
          <div className="text-center">
            <Blocks className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              {dentigramaCanvas ? 'Haz clic para editar dentigrama' : 'Haz clic para crear dentigrama'}
            </p>
            {dentigramaCanvas && (
              <img 
                src={dentigramaCanvas} 
                alt="Vista previa"
                className="mt-2 max-h-[100px] object-contain"
              />
            )}
          </div>
        </div>

      {/* Modal para dibujar el dentigrama */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto p-4">
            <h3 className="text-lg font-bold mb-4">Dentigrama Interactivo</h3>
            
            {/* Dentigrama interactivo */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <DentigramaEditor 
                fondoUrl={dentigramaCanvas}
                onExportar={(base64) => {
                  setCanvasData(base64);
                }}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white rounded-lg"
              >
                Guardar Dentigrama
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
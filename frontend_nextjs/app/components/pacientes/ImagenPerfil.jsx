'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';  // ← Agrega esta línea

export default function ImagenPerfil({ 
  imagenUrl, 
  nombrePaciente, 
  modo = 'mostrar',
  onImageChange,
  onImageDelete
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen válido.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewUrl = event.target.result;
        setLocalPreview(previewUrl);
        if (onImageChange) {
          onImageChange(previewUrl, file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = () => {
    setLocalPreview(null);
    if (onImageDelete) {
      onImageDelete();
    }
  };

  const imagenActual = localPreview || imagenUrl;

  // Modo registro/edición
  if (modo === 'registrar' || modo === 'editar') {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 min-h-[200px]">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Imagen de Perfil</h3>
        {imagenActual ? (
          <div className="relative">
            <img 
              src={imagenActual} 
              alt={nombrePaciente}
              className="w-full h-auto max-h-[150px] object-contain rounded-lg mb-2"
            />
            <div className="flex gap-2 justify-end">
              <label className="cursor-pointer bg-black text-white px-3 py-1 rounded-lg text-xs hover:bg-gray-800">
                Cambiar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 inline-block">
                Seleccionar Imagen
                <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                />
            </label>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG (máx 5MB)</p>
            </div>
        )}
      </div>
    );
  }

    // Modo mostrar
    if (!imagenActual) {
    return (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Sin imagen de perfil</p>
        </div>
        </div>
    );
    }

  return (
    <>
      <div 
        className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors min-h-[200px]"
        onClick={() => setModalAbierto(true)}
      >
        <img 
          src={imagenActual} 
          alt={nombrePaciente}
          className="max-w-full max-h-[150px] object-contain rounded-lg"
        />
      </div>

      {modalAbierto && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setModalAbierto(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={imagenActual} 
              alt={nombrePaciente}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button 
              className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-black hover:bg-gray-200"
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
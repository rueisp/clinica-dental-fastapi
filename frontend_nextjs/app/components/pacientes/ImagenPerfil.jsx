'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Lock, X } from 'lucide-react';
// Importamos la función de optimización
import { optimizarImagen } from '@/config/api';

export default function ImagenPerfil({ 
  imagenUrl, 
  nombrePaciente, 
  modo = 'mostrar',
  onImageChange,
  onImageDelete
}) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const [canUseMultimedia, setCanUseMultimedia] = useState(true);

  // 1. CARGAR PERMISOS (Sincronización con el Plan) - MANTENIDO
  useEffect(() => {
    const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}');
    if (perms.can_use_multimedia !== undefined) {
      setCanUseMultimedia(perms.can_use_multimedia);
    }
  }, []);

  // 2. FUNCIÓN PARA PROCESAR LA IMAGEN - MANTENIDO
  const handleImageChange = (e) => {
    if (!canUseMultimedia) return;

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

  // 3. FUNCIÓN PARA ELIMINAR LA IMAGEN - MANTENIDO
  const handleDelete = () => {
    setLocalPreview(null);
    if (onImageDelete) {
      onImageDelete();
    }
  };

  const imagenActual = localPreview || imagenUrl;

  // --- LÓGICA DE OPTIMIZACIÓN INYECTADA ---
  // Si es localPreview (blob), mostramos tal cual. Si es URL de Cloudinary, optimizamos.
  const imagenOptimizada = localPreview ? imagenActual : optimizarImagen(imagenActual, 400);
  const imagenZoom = localPreview ? imagenActual : optimizarImagen(imagenActual, 1200);

  // --- VISTA DE REGISTRO / EDICIÓN ---
  if (modo === 'registrar' || modo === 'editar') {
    return (
      <div className="relative">
        {/* Contenedor Visual: Mantenemos tus clases originales */}
        <div className={`bg-gray-50 rounded-3xl border border-gray-100 p-6 min-h-[400px] flex flex-col transition-all duration-500 ${!canUseMultimedia ? 'grayscale opacity-30 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-bold text-gray-400 mb-4 tracking-widest">Fotografía / Rx</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {imagenActual ? (
              <div className="w-full">
                <img 
                  src={imagenOptimizada} // <--- CAMBIO: Imagen Optimizada
                  alt={nombrePaciente} 
                  className="w-full h-auto max-h-[250px] object-contain rounded-2xl mb-4" 
                />
                <div className="flex gap-2 justify-end mt-auto">
                  <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition">
                      Cambiar Imagen
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <button type="button" onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 transition">
                      Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <Camera className="w-16 h-16 text-gray-300 mb-4" />
                <label className="cursor-pointer bg-black text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 transition">
                  Seleccionar Imagen
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-400 mt-4 font-medium">JPG, PNG (máx 5MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* 🔒 BOTÓN PRO PEQUEÑO - MANTENIDO */}
        {!canUseMultimedia && (
          <button 
            type="button"
            onClick={() => router.push('/planes')}
            className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-tighter hover:scale-105 transition-transform pointer-events-auto flex items-center gap-1"
          >
            <Lock size={10} /> PRO
          </button>
        )}
      </div>
    );
  }

  // --- VISTA MOSTRAR (VISTA DEL PACIENTE / FICHA) ---
  if (!imagenActual) {
    return (
      <div className="bg-gray-50 rounded-3xl border border-gray-100 p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-400 text-sm font-medium">Sin imagen de perfil</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Miniatura en la ficha - Mantenemos tus clases originales */}
      <div 
        className="bg-gray-50 rounded-3xl border border-gray-100 p-6 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors min-h-[200px]"
        onClick={() => setModalAbierto(true)}
      >
        <img 
          src={imagenOptimizada} // <--- CAMBIO: Imagen Optimizada
          alt={nombrePaciente} 
          className="max-w-full max-h-[150px] object-contain rounded-xl" 
        />
      </div>

      {/* --- EL MODAL PARA VER EN GRANDE - MANTENIDO --- */}
      {modalAbierto && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-pointer" 
          onClick={() => setModalAbierto(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]">
            <img 
              src={imagenZoom} // <--- CAMBIO: Imagen Zoom (Alta resolución pero optimizada)
              alt={nombrePaciente} 
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
            />
            {/* Botón cerrar modal con texto "CERRAR" - MANTENIDO */}
            <button 
              className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold text-sm hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation(); // Evitamos que el clic cierre el modal dos veces
                setModalAbierto(false);
              }}
            >
              CERRAR <X size={24} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
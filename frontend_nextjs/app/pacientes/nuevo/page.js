'use client';

import { useState, useRef, useEffect } from 'react'; // Agregamos useEffect
import { useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import DentigramaEditor from '@/app/components/pacientes/DentigramaEditor';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { API_BASE_URL, authFetch } from '@/config/api';
import { Lock } from 'lucide-react'; // Importamos icono de bloqueo

export default function NuevoPaciente() {
  const router = useRouter();
  const dentigramaRef = useRef();
  
  // ✅ ESTADO DE PERMISOS
  const [canUseOdontogram, setCanUseOdontogram] = useState(true);

  useEffect(() => {
    const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}');
    if (perms.can_use_odontogram !== undefined) setCanUseOdontogram(perms.can_use_odontogram);
  }, []);

  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', tipo_documento: '', documento: '',
    fecha_nacimiento: '', edad: '', sexo: '', telefono: '', email: '',
    ocupacion: '', direccion: '', barrio: '', motivo_consulta: '',
    enfermedad_actual: '', alergias: '', observaciones: '',
    cepillado_dental: '', habitos: '', dentigrama_canvas: ''
  });
  
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (preview, file) => {
    setImagenPreview(preview);
    setImagenFile(file);
  };

  const handleImageDelete = () => {
    setImagenPreview(null);
    setImagenFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Solo exportamos dentigrama si tenemos permiso
    let dentigramaBase64 = null;
    if (canUseOdontogram && dentigramaRef.current) {
        dentigramaBase64 = await dentigramaRef.current.exportar();
    }
    
    const submitData = new FormData();
    const textFields = Object.keys(formData);
    
    textFields.forEach(field => {
      if (formData[field]) submitData.append(field, formData[field]);
    });
    
    if (dentigramaBase64) submitData.append('dentigrama_canvas', dentigramaBase64);
    if (imagenFile) submitData.append('imagen_perfil', imagenFile);
    
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes`, {
        method: 'POST',
        body: submitData
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/pacientes/${data.paciente_id}`);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form id="form-registrar-paciente" onSubmit={handleSubmit}>
        <HeaderPaciente modo="registrar" />
        
        <TarjetaInfoPaciente 
          modo="registrar"
          formData={formData}
          onChange={handleChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* ✅ BLOQUE ODONTOGRAMA UNIFICADO */}
          <div className="relative">
            {/* El editor real en gris */}
            <div className={`transition-all ${!canUseOdontogram ? 'grayscale opacity-30 pointer-events-none' : ''}`}>
              <DentigramaEditor 
                ref={dentigramaRef}
                fondoUrl={null}
              />
            </div>

            {/* Pequeño Botón PRO (Mismo tamaño que el de la foto) */}
            {!canUseOdontogram && (
              <button 
                type="button"
                onClick={() => router.push('/planes')}
                className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-tighter hover:scale-105 transition-transform flex items-center gap-1"
              >
                <Lock size={10} strokeWidth={2} /> PRO
              </button>
            )}
          </div>

          <ImagenPerfil 
            imagenUrl={imagenPreview}
            nombrePaciente={`${formData.nombres} ${formData.apellidos}`}
            modo="registrar"
            onImageChange={handleImageChange}
            onImageDelete={handleImageDelete}
          />
        </div>
      </form>
    </div>
  );
}
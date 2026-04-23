'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import DentigramaEditor from '@/app/components/pacientes/DentigramaEditor';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { API_BASE_URL, authFetch } from '@/config/api';

export default function NuevoPaciente() {
  const router = useRouter();
  const dentigramaRef = useRef();
  
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    tipo_documento: '',
    documento: '',
    fecha_nacimiento: '',
    edad: '',
    sexo: '',
    telefono: '',
    email: '',
    ocupacion: '',
    direccion: '',
    barrio: '',
    motivo_consulta: '',
    enfermedad_actual: '',
    alergias: '',
    observaciones: '',
    cepillado_dental: '',
    habitos: '',
    dentigrama_canvas: ''
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
    
    // Obtener el dentigrama como base64
    const dentigramaBase64 = await dentigramaRef.current.exportar();
    
    const submitData = new FormData();
    
    // Campos de texto
    const textFields = ['nombres', 'apellidos', 'tipo_documento', 'documento', 'fecha_nacimiento', 
                        'edad', 'sexo', 'telefono', 'email', 'ocupacion', 'direccion', 'barrio', 
                        'motivo_consulta', 'enfermedad_actual', 'alergias', 'observaciones', 
                        'cepillado_dental', 'habitos'];
    
    textFields.forEach(field => {
      if (formData[field]) {
        submitData.append(field, formData[field]);
      }
    });
    
    // Dentigrama (base64)
    if (dentigramaBase64) {
      submitData.append('dentigrama_canvas', dentigramaBase64);
    }
    
    // Imagen
    if (imagenFile) {
      submitData.append('imagen_perfil', imagenFile);
    }
    
    try {
      const response = await authFetch(`${API_BASE_URL}/api/pacientes`, {
        method: 'POST',
        body: submitData
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/pacientes/${data.paciente_id}`);
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al crear paciente');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form id="form-registrar-paciente" onSubmit={handleSubmit}>
        <HeaderPaciente 
          modo="registrar"
        />
        
        <TarjetaInfoPaciente 
          modo="registrar"
          formData={formData}
          onChange={handleChange}
        />

        {/* Sección inferior: Dentigrama e Imagen en dos columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <DentigramaEditor 
            ref={dentigramaRef}
            fondoUrl={null}
          />
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
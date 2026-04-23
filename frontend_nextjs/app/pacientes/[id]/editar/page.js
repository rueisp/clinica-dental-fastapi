'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import DentigramaEditor from '@/app/components/pacientes/DentigramaEditor';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';

export default function EditarPaciente() {
  const { id } = useParams();
  const router = useRouter();
  const dentigramaRef = useRef();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const response = await fetch(`http://192.168.1.7:8001/api/pacientes/${id}`, {
          headers: { 'Authorization': 'Bearer test_token_123' }
        });
        
        if (!response.ok) {
          throw new Error('Paciente no encontrado');
        }
        
        const data = await response.json();
        setPaciente(data);
        if (data.imagen_perfil_url) {
          setImagenPreview(data.imagen_perfil_url);
        }
      } catch (err) {
        alert(err.message);
        router.push('/pacientes');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPaciente();
    }
  }, [id, router]);

  const handleChange = (name, value) => {
    setPaciente(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (preview, file) => {
    setImagenPreview(preview);
    setImagenFile(file);
  };

  const handleImageDelete = () => {
    setImagenPreview(null);
    setImagenFile(null);
    setPaciente(prev => ({ ...prev, eliminar_imagen: 'true' }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Exportar dentigrama
    const dentigramaBase64 = await dentigramaRef.current.exportar();
    
    // Crear FormData
    const formData = new FormData();
    
    // Agregar todos los campos de texto
    if (paciente.nombres) formData.append('nombres', paciente.nombres);
    if (paciente.apellidos) formData.append('apellidos', paciente.apellidos);
    if (paciente.tipo_documento) formData.append('tipo_documento', paciente.tipo_documento);
    if (paciente.documento) formData.append('documento', paciente.documento);
    if (paciente.fecha_nacimiento) formData.append('fecha_nacimiento', paciente.fecha_nacimiento);
    if (paciente.edad) formData.append('edad', paciente.edad);
    if (paciente.sexo) formData.append('sexo', paciente.sexo);
    if (paciente.email) formData.append('email', paciente.email);
    if (paciente.telefono) formData.append('telefono', paciente.telefono);
    if (paciente.direccion) formData.append('direccion', paciente.direccion);
    if (paciente.barrio) formData.append('barrio', paciente.barrio);
    if (paciente.motivo_consulta) formData.append('motivo_consulta', paciente.motivo_consulta);
    if (paciente.enfermedad_actual) formData.append('enfermedad_actual', paciente.enfermedad_actual);
    if (paciente.alergias) formData.append('alergias', paciente.alergias);
    if (paciente.observaciones) formData.append('observaciones', paciente.observaciones);
    if (paciente.ocupacion) formData.append('ocupacion', paciente.ocupacion);
    if (paciente.cepillado_dental) formData.append('cepillado_dental', paciente.cepillado_dental);
    if (paciente.habitos) formData.append('habitos', paciente.habitos);
    
    // Dentigrama (base64)
    if (dentigramaBase64) {
      formData.append('dentigrama_canvas', dentigramaBase64);
    }
    
    // Imagen de perfil (si se seleccionó una nueva)
    if (imagenFile) {
      formData.append('imagen_perfil', imagenFile);
    }
    
    // Flag para eliminar imagen (si se eliminó)
    if (paciente.eliminar_imagen === 'true') {
      formData.append('eliminar_imagen', 'true');
    }
    
    try {
      const response = await fetch(`http://192.168.1.7:8001/api/pacientes/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test_token_123'
          // ❌ NO incluyas 'Content-Type' cuando usas FormData
        },
        body: formData
      });
      
      if (response.ok) {
        router.push(`/pacientes/${id}`);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Error al actualizar paciente');
      }
    } catch (error) {
      alert('Error al conectar con el servidor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HeaderPaciente loading={true} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-center">
        <p className="text-yellow-700 text-sm">
           Editando a <strong>{paciente?.nombre_completo}</strong>
        </p>
      </div>

      <form id="form-editar-paciente" onSubmit={handleSubmit}>
        <HeaderPaciente 
          paciente={paciente}
          modo="editar"
        />
        
        <TarjetaInfoPaciente 
          paciente={paciente}
          modo="editar"
          onChange={handleChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <DentigramaEditor 
            ref={dentigramaRef}
            fondoUrl={paciente.dentigrama_canvas}
          />
          <ImagenPerfil 
            imagenUrl={imagenPreview}
            nombrePaciente={`${paciente.nombres} ${paciente.apellidos}`}
            modo="editar"
            onImageChange={handleImageChange}
            onImageDelete={handleImageDelete}
          />
        </div>
      </form>
    </div>
  );
}
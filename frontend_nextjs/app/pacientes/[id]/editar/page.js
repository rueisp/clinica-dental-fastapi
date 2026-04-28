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

  // Usamos la variable de entorno que configuramos en .env.local
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        // CORRECCIÓN: Usamos el ID de la URL y la variable dinámica
        const response = await fetch(`${API_URL}/api/pacientes/${id}`, {
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
        console.error("Error fetching:", err);
        alert(err.message);
        router.push('/pacientes');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPaciente();
    }
  }, [id, router, API_URL]);

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
    if (!paciente) return;
    setSaving(true);
    
    try {
      const dentigramaBase64 = await dentigramaRef.current.exportar();
      const formData = new FormData();
      
      // Lista de campos a enviar
      const campos = [
        'nombres', 'apellidos', 'tipo_documento', 'documento', 
        'fecha_nacimiento', 'edad', 'sexo', 'email', 'telefono', 
        'direccion', 'barrio', 'motivo_consulta', 'enfermedad_actual', 
        'alergias', 'observaciones', 'ocupacion', 'cepillado_dental', 'habitos'
      ];

      campos.forEach(campo => {
        if (paciente[campo]) formData.append(campo, paciente[campo]);
      });
      
      if (dentigramaBase64) formData.append('dentigrama_canvas', dentigramaBase64);
      if (imagenFile) formData.append('imagen_perfil', imagenFile);
      if (paciente.eliminar_imagen === 'true') formData.append('eliminar_imagen', 'true');

      const response = await fetch(`${API_URL}/api/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test_token_123' },
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

  // PROTECCIÓN 1: Mientras carga o si el paciente es null, no mostramos el formulario
  if (loading || !paciente) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <HeaderPaciente loading={true} />
        <p className="mt-4 text-gray-500">Cargando datos del paciente...</p>
      </div>
    );
  }

  // PROTECCIÓN 2: Uso de "?" (Optional Chaining) en todo el diseño
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-center">
        <p className="text-yellow-700 text-sm">
           Editando a <strong>{paciente?.nombre_completo || `${paciente?.nombres} ${paciente?.apellidos}`}</strong>
        </p>
      </div>

      <form id="form-editar-paciente" onSubmit={handleSubmit}>
        <HeaderPaciente 
          paciente={paciente}
          modo="editar"
          saving={saving}
        />
        
        <TarjetaInfoPaciente 
          paciente={paciente}
          modo="editar"
          onChange={handleChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <DentigramaEditor 
            ref={dentigramaRef}
            fondoUrl={paciente?.dentigrama_canvas}
          />
          <ImagenPerfil 
            imagenUrl={imagenPreview}
            nombrePaciente={`${paciente?.nombres} ${paciente?.apellidos}`}
            modo="editar"
            onImageChange={handleImageChange}
            onImageDelete={handleImageDelete}
          />
        </div>
      </form>
    </div>
  );
}
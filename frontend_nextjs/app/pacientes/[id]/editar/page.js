'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import DentigramaEditor from '@/app/components/pacientes/DentigramaEditor';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { Lock } from 'lucide-react'; 

export default function EditarPaciente() {
  const { id } = useParams();
  const router = useRouter();
  const dentigramaRef = useRef();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  // --- ESTADOS DE PERMISOS ---
  const [canUseOdontogram, setCanUseOdontogram] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  useEffect(() => {
    // 1. CARGAR PERMISOS DESDE LOCALSTORAGE
    const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (isAdmin) {
      setCanUseOdontogram(true);
    } else if (perms.can_use_odontogram !== undefined) {
      setCanUseOdontogram(perms.can_use_odontogram);
    }

    const fetchPaciente = async () => {
      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
            const llaves = Object.keys(localStorage);
            console.log("Nombres de llaves encontradas:", llaves);
            throw new Error('Sesión no encontrada. Por favor inicie sesión.');
        }

        const response = await fetch(`${API_URL}/api/pacientes/${id}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
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

    if (id) fetchPaciente();
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
      const token = localStorage.getItem('auth_token');

      if (!token) {
          alert("La sesión ha expirado. Por favor, vuelva a iniciar sesión.");
          router.push('/login');
          return;
      }

      // SOLO EXPORTAR DENTIGRAMA SI TIENE PERMISO
      let dentigramaBase64 = null;
      if (canUseOdontogram && dentigramaRef.current) {
        dentigramaBase64 = await dentigramaRef.current.exportar();
      }

      const formData = new FormData();
      
      const campos = [
        'nombres', 'apellidos', 'tipo_documento', 'documento', 
        'fecha_nacimiento', 'edad', 'sexo', 'email', 'telefono', 
        'direccion', 'barrio', 'motivo_consulta', 'enfermedad_actual', 
        'alergias', 'observaciones', 'ocupacion', 'cepillado_dental', 'habitos'
      ];

      campos.forEach(campo => {
        if (paciente[campo] !== undefined && paciente[campo] !== null) {
            formData.append(campo, paciente[campo]);
        }
      });
      
      if (dentigramaBase64) formData.append('dentigrama_canvas', dentigramaBase64);
      if (imagenFile) formData.append('imagen_perfil', imagenFile);
      if (paciente.eliminar_imagen === 'true') formData.append('eliminar_imagen', 'true');

      const response = await fetch(`${API_URL}/api/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        alert('Paciente actualizado correctamente');
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

  if (loading || !paciente) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <HeaderPaciente loading={true} />
        <p className="mt-4 text-gray-500 font-medium">Cargando historial clínico...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-center">
        <p className="text-blue-700 text-sm">
           Editando historial de: <strong>{paciente.nombres} {paciente.apellidos}</strong>
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
          
          {/* BLOQUE ODONTOGRAMA CONSISTENTE */}
          <div className="relative">
            <div className={`transition-all duration-500 ${!canUseOdontogram ? 'grayscale opacity-30 pointer-events-none' : ''}`}>
              <DentigramaEditor 
                ref={dentigramaRef}
                fondoUrl={paciente.dentigrama_canvas}
              />
            </div>
            
            {!canUseOdontogram && (
              <button 
                type="button"
                onClick={() => router.push('/planes')}
                className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg font-black text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-1.5 z-10 shadow-lg shadow-green-100"
              >
                <Lock size={10} strokeWidth={3} /> PRO
              </button>
            )}
          </div>

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
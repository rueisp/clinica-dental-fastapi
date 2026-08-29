'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import DentigramaEditor from '@/app/components/pacientes/DentigramaEditor';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { Lock } from 'lucide-react'; 
import { authFetch, parseApiResponse, API_ENDPOINTS } from '@/config/api';

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
  const [modalOdontograma, setModalOdontograma] = useState(false); // <-- AGREGAR ESTA LÍNEA


  useEffect(() => {
    // 1. Cargar permisos de la cuenta
    const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (isAdmin) {
      setCanUseOdontogram(true);
    } else if (perms.can_use_odontogram !== undefined) {
      setCanUseOdontogram(perms.can_use_odontogram);
    }

    // 2. Cargar datos del paciente de forma segura
    const fetchPaciente = async () => {
      try {
        const response = await authFetch(API_ENDPOINTS.PACIENTE_BY_ID(id));
        const { ok, error, data } = await parseApiResponse(response);

        if (!ok) {
          alert(`⚠️ ${error}`);
          router.push('/pacientes');
          return;
        }
        
        setPaciente(data);
        if (data.imagen_perfil_url) {
          setImagenPreview(data.imagen_perfil_url);
        }
      } catch (err) {
        console.error("Error fetching paciente:", err);
        alert('Error de conexión al cargar los datos del paciente');
        router.push('/pacientes');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPaciente();
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
    if (!paciente) return;
    setSaving(true);
    
    try {
      // Exportar dentigrama si tiene permiso
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
            let valor = paciente[campo];
            if (campo === 'fecha_nacimiento' && typeof valor === 'string' && valor.includes('/')) {
              const [dia, mes, anio] = valor.split('/');
              valor = `${anio}-${mes}-${dia}`;
            }
            formData.append(campo, valor);
        }
      });
      
      if (dentigramaBase64) formData.append('dentigrama_canvas', dentigramaBase64);
      if (imagenFile) formData.append('imagen_perfil', imagenFile);
      if (paciente.eliminar_imagen === 'true') formData.append('eliminar_imagen', 'true');

      // 🔑 Petición limpia con authFetch a la API
      const response = await authFetch(API_ENDPOINTS.PACIENTE_BY_ID(id), {
        method: 'PUT',
        body: formData
      });
      
      // 🔑 Parseo seguro de la respuesta (éxito o error de plan vencido)
      const { ok, error } = await parseApiResponse(response);

      if (ok) {
        alert('✅ Paciente actualizado correctamente');
        router.push(`/pacientes/${id}`);
      } else {
        // 🔔 NOTIFICACIÓN EXPLÍCITA AL ODONTÓLOGO
        alert(`⚠️ ${error}`);
      }
    } catch (error) {
      alert('Error de conexión con el servidor');
    } finally {
      setSaving(false); // Desbloquea el botón siempre
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
          
          {/* ✅ BLOQUE ODONTOGRAMA CON MODAL CONTROLADO POR CSS */}
          <div className="relative">
            <div 
              className={`bg-gray-50 rounded-3xl border border-gray-100 p-6 min-h-[400px] flex flex-col items-center justify-center transition-all ${
                !canUseOdontogram ? 'grayscale opacity-40' : 'cursor-pointer hover:bg-gray-100'
              }`}
              onClick={canUseOdontogram ? () => setModalOdontograma(true) : () => router.push('/planes')}
            >
              <div className="text-center relative w-full">
                {!canUseOdontogram ? (
                  <div className="flex flex-col items-center">
                    <span className="text-4xl mb-3 block">🦷</span>
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Odontograma Digital Bloqueado</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-4xl mb-3 block">🦷</span>
                    <p className="text-gray-500 text-sm font-black uppercase tracking-widest">
                      Toca para abrir el Odontograma
                    </p>
                    <p className="text-[11px] text-blue-500 font-bold mt-2 uppercase tracking-wider">
                      (Se abrirá en pantalla completa)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pequeño Botón PRO (Mismo tamaño y posición que el de la foto de perfil) */}
            {!canUseOdontogram && (
              <button 
                type="button"
                onClick={() => router.push('/planes')}
                className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-1.5 z-10 shadow-lg shadow-green-100"
              >
                <Lock size={10} strokeWidth={3} /> PRO
              </button>
            )}

            {/* Modal del Editor de Odontograma (Siempre montado en el DOM para preservar el estado y la referencia) */}
            <div className={modalOdontograma ? "fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" : "hidden"}>
              <div className="relative bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-auto p-10 shadow-2xl">
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-8">Editor de Odontograma</h3>
                <div className="border-2 border-zinc-100 rounded-[2rem] p-6 bg-zinc-50/50">
                  <DentigramaEditor 
                    ref={dentigramaRef}
                    fondoUrl={paciente.dentigrama_canvas}
                  />
                </div>
                <div className="flex justify-end gap-4 mt-10">
                  <button 
                    type="button"
                    onClick={() => setModalOdontograma(false)} 
                    className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl cursor-pointer"
                  >
                    Confirmar y Cerrar
                  </button>
                </div>
              </div>
            </div>
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
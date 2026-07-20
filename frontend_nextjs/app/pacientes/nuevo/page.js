'use client';

import { useState, useRef, useEffect, Suspense } from 'react'; // Agregamos useEffect
import { useRouter, useSearchParams } from 'next/navigation';
import HeaderPaciente from '@/app/components/pacientes/HeaderPaciente';
import TarjetaInfoPaciente from '@/app/components/pacientes/TarjetaInfoPaciente';
import DentigramaEditor from '@/app/components/pacientes/DentigramaEditor';
import ImagenPerfil from '@/app/components/pacientes/ImagenPerfil';
import { API_BASE_URL, authFetch } from '@/config/api';
import { Lock } from 'lucide-react'; // Importamos icono de bloqueo

function NuevoPacienteForm() { // Cambiado de "export default function NuevoPaciente()" a "function NuevoPacienteForm()"
  const router = useRouter();
  const searchParams = useSearchParams(); // Inicializado para leer la URL
  const dentigramaRef = useRef();
  
  const citaId = searchParams.get('cita_id'); // Extraemos el ID de la cita si viene en la URL
  
  // ✅ ESTADO DE PERMISOS
  const [canUseOdontogram, setCanUseOdontogram] = useState(true);
  const [modalOdontograma, setModalOdontograma] = useState(false); // <-- AGREGAR ESTA LÍNEA

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

  // --- NUEVO: Efecto para precargar los datos de la cita si vienen en la URL ---
  useEffect(() => {
    const nombres = searchParams.get('nombres') || '';
    const apellidos = searchParams.get('apellidos') || '';
    const telefono = searchParams.get('telefono') || '';

    if (nombres || apellidos || telefono) {
      setFormData(prev => ({
        ...prev,
        nombres,
        apellidos,
        telefono
      }));
    }
  }, [searchParams]);

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
      if (formData[field]) {
        let valor = formData[field];
        
        // Convertir fecha_nacimiento de DD/MM/YYYY a YYYY-MM-DD para el backend
        if (field === 'fecha_nacimiento' && typeof valor === 'string' && valor.includes('/')) {
          const [dia, mes, anio] = valor.split('/');
          valor = `${anio}-${mes}-${dia}`;
        }
        
        submitData.append(field, valor);
      }
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
        const nuevoPacienteId = data.paciente_id;

        // --- NUEVO: Si venimos de una cita, la vinculamos automáticamente en segundo plano ---
        if (citaId) {
          try {
            await authFetch(`${API_BASE_URL}/api/citas/${citaId}`, {
              method: 'PUT',
              body: JSON.stringify({ paciente_id: nuevoPacienteId })
            });
          } catch (err) {
            console.error("Error al vincular la cita con el paciente:", err);
          }
        }

        router.push(`/pacientes/${nuevoPacienteId}`);
      } else {
        // Captura el error 403 (o cualquier otro) y lo muestra en pantalla
        const errorData = await response.json();
        alert(errorData.detail || 'No se pudo registrar el paciente');
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
                className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-tighter hover:scale-105 transition-transform flex items-center gap-1 z-10"
              >
                <Lock size={10} strokeWidth={2} /> PRO
              </button>
            )}

            {/* Modal del Editor de Odontograma (Siempre montado en el DOM para preservar el estado y la referencia) */}
            <div className={modalOdontograma ? "fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" : "hidden"}>
              <div className="relative bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-auto p-10 shadow-2xl">
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-8">Editor de Odontograma</h3>
                <div className="border-2 border-zinc-100 rounded-[2rem] p-6 bg-zinc-50/50">
                  <DentigramaEditor 
                    ref={dentigramaRef}
                    fondoUrl={null}
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

// Exportación final envuelta en Suspense para Next.js
export default function NuevoPaciente() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-medium text-gray-500">Cargando formulario...</div>}>
      <NuevoPacienteForm />
    </Suspense>
  );
}
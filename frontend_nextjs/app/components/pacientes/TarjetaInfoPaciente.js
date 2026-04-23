'use client';

import { User, Heart, Trash2} from 'lucide-react';

export default function TarjetaInfoPaciente({ 
  paciente,     
  modo,         
  onChange,     
  formData      
}) {
  
  // Función para calcular edad
  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '';
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad >= 0 ? edad : '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'fecha_nacimiento') {
      const nuevaEdad = calcularEdad(value);
      if (onChange) {
        onChange(name, value);
        onChange('edad', nuevaEdad);
      }
    } else {
      if (onChange) {
        onChange(name, value);
      }
    }
  };

    // ✅ AGREGAR AQUÍ - Función para eliminar paciente
  const handleEliminar = async () => {
    const confirmar = confirm('¿Estás seguro de mover este paciente a la papelera?');
    if (!confirmar) return;
    
    try {
      const response = await fetch(`http://192.168.1.7:8001/api/pacientes/${paciente.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test_token_123' }
      });
      
      if (response.ok) {
        alert('Paciente movido a la papelera');
        window.location.href = '/pacientes';
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al eliminar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  // Modo solo lectura (mostrar)
  if (modo === 'mostrar') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-gray-600" />
          Información del Paciente
        </h2>
        
        {/* Fila 1: Nombres, Apellidos, Tipo Documento, Documento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Nombres</p>
            <p className="text-sm font-medium text-black">{paciente?.nombres || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Apellidos</p>
            <p className="text-sm font-medium text-black">{paciente?.apellidos || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tipo Documento</p>
            <p className="text-sm font-medium text-black">{paciente?.tipo_documento || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Documento</p>
            <p className="text-sm font-medium text-black">{paciente?.documento || 'N/A'}</p>
          </div>
        </div>

        {/* Fila 2: Fecha Nacimiento, Edad, Sexo, Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Fecha Nacimiento</p>
            <p className="text-sm font-medium text-black">{paciente?.fecha_nacimiento || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Edad</p>
            <p className="text-sm font-medium text-black">{paciente?.edad || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Sexo</p>
            <p className="text-sm font-medium text-black">
              {paciente?.sexo === 'M' ? 'Masculino' : paciente?.sexo === 'F' ? 'Femenino' : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Teléfono</p>
            <p className="text-sm font-medium text-black">{paciente?.telefono || 'N/A'}</p>
          </div>
        </div>

        {/* Fila 3: Email, Ocupación, Dirección, Barrio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-black">{paciente?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ocupación</p>
            <p className="text-sm font-medium text-black">{paciente?.ocupacion || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Dirección</p>
            <p className="text-sm font-medium text-black">{paciente?.direccion || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Barrio</p>
            <p className="text-sm font-medium text-black">{paciente?.barrio || 'N/A'}</p>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-gray-100 my-4"></div>

        <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
          <Heart className="w-6 h-6 text-gray-600" />
          Información Clínica
        </h2>

        {/* Fila 4: Motivo de Consulta, Enfermedad Actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Motivo de Consulta</p>
            <p className="text-sm text-black bg-gray-50 p-3 rounded-xl">{paciente?.motivo_consulta || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Enfermedad Actual</p>
            <p className="text-sm text-black bg-gray-50 p-3 rounded-xl">{paciente?.enfermedad_actual || 'N/A'}</p>
          </div>
        </div>

        {/* Fila 5: Alergias, Observaciones Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Alergias</p>
            <p className="text-sm text-black bg-gray-50 p-3 rounded-xl">{paciente?.alergias || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Observaciones Generales</p>
            <p className="text-sm text-black bg-gray-50 p-3 rounded-xl">{paciente?.observaciones || 'N/A'}</p>
          </div>
        </div>

        {/* Fila 6: Cepillado Dental y Hábitos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Cepillado Dental</p>
            <p className="text-sm text-black bg-gray-50 p-3 rounded-xl">{paciente?.cepillado_dental || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Hábitos</p>
            <p className="text-sm text-black bg-gray-50 p-3 rounded-xl">{paciente?.habitos || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Modo edición o registro
  const data = modo === 'editar' ? paciente : formData;
  const esRegistro = modo === 'registrar';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
        <User className="w-6 h-6 text-gray-600" />
        Información del Paciente
      </h2>
      
      {/* Fila 1: Nombres, Apellidos, Tipo Documento, Documento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nombres {esRegistro && '*'}</label>
          <input
            type="text"
            name="nombres"
            value={data?.nombres || ''}
            onChange={handleChange}
            required={esRegistro}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: Juan"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Apellidos {esRegistro && '*'}</label>
          <input
            type="text"
            name="apellidos"
            value={data?.apellidos || ''}
            onChange={handleChange}
            required={esRegistro}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: Pérez"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Tipo Documento</label>
          <select
            name="tipo_documento"
            value={data?.tipo_documento || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm bg-white"
          >
            <option value="">Seleccione</option>
            <option value="CC">Cédula de Ciudadanía</option>
            <option value="TI">Tarjeta de Identidad</option>
            <option value="CE">Cédula de Extranjería</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Documento {esRegistro && '*'}</label>
          <input
            type="text"
            name="documento"
            value={data?.documento || ''}
            onChange={handleChange}
            required={esRegistro}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: 123456789"
          />
        </div>
      </div>

      {/* Fila 2: Fecha Nacimiento, Edad, Sexo, Teléfono */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Fecha Nacimiento</label>
          <input
            type="date"
            name="fecha_nacimiento"
            value={data?.fecha_nacimiento ? data.fecha_nacimiento.split('/').reverse().join('-') : ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Edad</label>
          <input
            type="text"
            name="edad"
            value={data?.edad || ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            placeholder="Se calcula"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Sexo</label>
          <select
            name="sexo"
            value={data?.sexo || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm bg-white"
          >
            <option value="">Seleccione</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Teléfono {esRegistro && '*'}</label>
          <input
            type="text"
            name="telefono"
            value={data?.telefono || ''}
            onChange={handleChange}
            required={esRegistro}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: 3001234567"
          />
        </div>
      </div>

      {/* Fila 3: Email, Ocupación, Dirección, Barrio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={data?.email || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: juan@email.com"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Ocupación</label>
          <input
            type="text"
            name="ocupacion"
            value={data?.ocupacion || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: Ingeniero, Estudiante"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Dirección</label>
          <input
            type="text"
            name="direccion"
            value={data?.direccion || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: Calle 123"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Barrio</label>
          <input
            type="text"
            name="barrio"
            value={data?.barrio || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: El Poblado"
          />
        </div>
      </div>

      {/* Separador */}
      <div className="border-t border-gray-100 my-4"></div>

      <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
        <Heart className="w-6 h-6 text-gray-600" />
        Información Clínica
      </h2>

      {/* Fila 4: Motivo de Consulta, Enfermedad Actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Motivo de Consulta</label>
          <textarea
            name="motivo_consulta"
            value={data?.motivo_consulta || ''}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="¿Por qué consulta el paciente?"
          ></textarea>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Enfermedad Actual</label>
          <textarea
            name="enfermedad_actual"
            value={data?.enfermedad_actual || ''}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Describa la enfermedad actual"
          ></textarea>
        </div>
      </div>

      {/* Fila 5: Alergias, Observaciones Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Alergias</label>
          <textarea
            name="alergias"
            value={data?.alergias || ''}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="¿Tiene alguna alergia?"
          ></textarea>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Observaciones Generales</label>
          <textarea
            name="observaciones"
            value={data?.observaciones || ''}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Observaciones adicionales"
          ></textarea>
        </div>
      </div>
      {/* Fila 6: Cepillado Dental y Hábitos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Cepillado Dental</label>
          <textarea
            name="cepillado_dental"
            value={data?.cepillado_dental || ''}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: 3 veces al día, usa hilo dental, etc."
          ></textarea>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Hábitos</label>
          <textarea
            name="habitos"
            value={data?.habitos || ''}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Ej: Fuma, toma café, bruxismo, etc."
          ></textarea>
        </div>
      </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import { ArrowLeft, Save, User, Phone, X } from 'lucide-react';

export default function NuevoPago() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const esRapidoParam = searchParams.get('rapido') === '1';

  const [form, setForm] = useState({
    paciente_id: null,
    paciente_nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    monto: '',
    metodo_pago: 'Efectivo',
    observacion: '', // Campo vinculado a Supabase
    telefono: '',
    es_rapido: esRapidoParam
  });

  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  useEffect(() => {
    if (busqueda.length > 1) {
      const timer = setTimeout(async () => {
        const res = await authFetch(`${API_ENDPOINTS.PACIENTES}?search=${busqueda}`);
        if (res.ok) {
          const data = await res.json();
          setPacientes(data.pacientes || []);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [busqueda]);

  const seleccionarPaciente = (p) => {
    setForm({ 
      ...form, 
      paciente_id: p.id, 
      paciente_nombre: `${p.nombres} ${p.apellidos}`,
      telefono: p.telefono || '',
      es_rapido: false 
    });
    setBusqueda(`${p.nombres} ${p.apellidos}`);
    setMostrarSugerencias(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Preparamos los datos EXACTOS que espera su nuevo modelo de Python
    const datosParaEnviar = {
      paciente_id: form.paciente_id, // UUID o null
      paciente_nombre: form.paciente_nombre,
      monto: parseFloat(form.monto), // Forzar número
      metodo_pago: form.metodo_pago,
      concepto: form.concepto,
      fecha: form.fecha,
      telefono: form.telefono,
      observacion: form.observacion,
      es_rapido: form.es_rapido
    };

    try {
      // Verifique que API_ENDPOINTS.NUEVO_PAGO sea la URL correcta (ej: http://localhost:8000/api/pagos/nuevo)
      const res = await authFetch(API_ENDPOINTS.NUEVO_PAGO, {
        method: 'POST',
        body: JSON.stringify(datosParaEnviar)
      });

      if (res.ok) {
        const pagoCreado = await res.json();
        router.push(`/pagos/recibo/${pagoCreado.codigo}`);
      } else {
        const errorData = await res.json();
        alert(`Error del servidor: ${errorData.detail}`);
      }
    } catch (err) {
      console.error("Error en el envío:", err);
      // Si entra aquí con "Failed to fetch", es que la URL está mal o el Backend está caído
      alert("No se pudo conectar con el servidor. Verifique la conexión.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-gray-600 mb-6">
          <ArrowLeft size={20} className="mr-2" /> Volver
        </button>

        <h1 className="text-2xl font-bold mb-6 text-black">
          {form.es_rapido ? '⚡ Cobro Rápido' : '💰 Registrar Pago'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border">
          {/* Autocompletado de Paciente */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase">Paciente</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={busqueda || form.paciente_nombre}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setForm({...form, paciente_nombre: e.target.value, paciente_id: null, es_rapido: true});
                  setMostrarSugerencias(true);
                }}
                // Si ya hay un paciente seleccionado, reducimos el padding derecho para que no tape la X
                className={`w-full pl-10 ${form.paciente_id ? 'pr-10' : 'pr-4'} py-3 bg-gray-50 rounded-xl border-none text-black`}
                placeholder="Nombre del paciente..."
                required
              />
              {/* Botón de X para limpiar la selección si ya hay un paciente vinculado */}
              {(busqueda || form.paciente_nombre) && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setForm({
                      ...form,
                      paciente_id: null,
                      paciente_nombre: '',
                      telefono: '',
                      es_rapido: true
                    });
                  }}
                  className="absolute right-3 top-3 text-gray-400 hover:text-black transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {mostrarSugerencias && pacientes.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1">
                {pacientes.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => seleccionarPaciente(p)}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-bottom text-black"
                  >
                    {p.nombres} {p.apellidos}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Monto (COP)</label>
              <input
                type="number"
                value={form.monto}
                onChange={(e) => setForm({...form, monto: e.target.value})}
                className="w-full p-3 bg-gray-50 rounded-xl text-black font-bold"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Método</label>
              <select 
                value={form.metodo_pago}
                onChange={(e) => setForm({...form, metodo_pago: e.target.value})}
                className="w-full p-3 bg-gray-50 rounded-xl text-black"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Nequi">Nequi</option>
                <option value="Bancolombia">Bancolombia</option>
                <option value="Bre-B">Bre-B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Concepto</label>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({...form, concepto: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl text-black"
              placeholder="Ej. Limpieza, Resina..."
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Teléfono (WhatsApp)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({...form, telefono: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-black"
                placeholder="300..."
              />
            </div>
          </div>

          {/* Campo de Observación Agregado */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Observación (Opcional)</label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({...form, observacion: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl text-black resize-none"
              placeholder="Notas adicionales sobre el pago..."
              rows="2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 hover:bg-green-600 shadow-lg"
          >
            <Save size={20} /> Guardar y Generar Recibo
          </button>
        </form>
      </div>
    </div>
  );
}
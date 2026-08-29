'use client';

import { useState, useEffect } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';
import { 
  Bot, Clock, DollarSign, Image as ImageIcon, Save, Plus, 
  Trash2, RotateCcw, Check, Sparkles, Building, MapPin, 
  Phone, MessageSquare, AlertCircle, RefreshCw, X
} from 'lucide-react';

export default function BotConfigPage() {
  const [tabActiva, setTabActiva] = useState('servicios'); // 'servicios', 'horarios', 'promos'
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Estados de datos
  const [configGeneral, setConfigGeneral] = useState({});
  const [servicios, setServicios] = useState([]);
  const [chatbotItems, setChatbotItems] = useState([]);

  // Modal para agregar servicio
  const [modalServicio, setModalServicio] = useState(false);
  const [nuevoServicio, setNuevoServicio] = useState({
    servicio: '', categoria: 'General', precio: 'COP ', descripcion: '', palabras_clave: ''
  });

  // Modal para agregar FAQ / Promo
  const [modalChatbot, setModalChatbot] = useState(false);
  const [nuevoChatbot, setNuevoChatbot] = useState({
    intencion: '', palabras_clave: '', respuesta: '', link_imagen: ''
  });
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // 1. Cargar toda la información del bot
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resCfg, resSrv, resBot] = await Promise.all([
        authFetch(API_ENDPOINTS.BOT_CONFIG_GENERAL),
        authFetch(API_ENDPOINTS.BOT_CONFIG_SERVICIOS),
        authFetch(API_ENDPOINTS.BOT_CONFIG_CHATBOT)
      ]);

      if (resCfg.ok) {
        const dataCfg = await resCfg.json();
        setConfigGeneral(dataCfg.configuracion || {});
      }
      if (resSrv.ok) {
        const dataSrv = await resSrv.json();
        setServicios(dataSrv.servicios || []);
      }
      if (resBot.ok) {
        const dataBot = await resBot.json();
        setChatbotItems(dataBot.items || []);
      }
    } catch (err) {
      console.error('Error cargando configuración del bot:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const notificarExito = (texto) => {
    setMensajeExito(texto);
    setTimeout(() => setMensajeExito(null), 3000);
  };

  // 2. Guardar Configuración General (Sede, Horarios, Saludos)
  const handleGuardarGeneral = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await authFetch(API_ENDPOINTS.BOT_CONFIG_GENERAL, {
        method: 'PUT',
        body: JSON.stringify(configGeneral)
      });
      if (res.ok) {
        notificarExito('¡Horarios e información de sede actualizados con éxito!');
      } else {
        alert('Error al guardar la información');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  // 3. Crear / Editar / Eliminar Servicios
  const handleCrearServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.servicio.trim() || !nuevoServicio.precio.trim()) {
      return alert('Por favor ingresa nombre y precio del tratamiento');
    }

    try {
      const res = await authFetch(API_ENDPOINTS.BOT_CONFIG_SERVICIOS, {
        method: 'POST',
        body: JSON.stringify(nuevoServicio)
      });
      if (res.ok) {
        setModalServicio(false);
        setNuevoServicio({ servicio: '', categoria: 'General', precio: 'COP ', descripcion: '', palabras_clave: '' });
        notificarExito('Tratamiento agregado correctamente');
        cargarDatos();
      }
    } catch (err) {
      alert('Error al crear el servicio');
    }
  };

  const handleActualizarServicioCampo = async (id, campo, valor) => {
    try {
      await authFetch(`${API_ENDPOINTS.BOT_CONFIG_SERVICIOS}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ [campo]: valor })
      });
      setServicios(prev => prev.map(s => s.id === id ? { ...s, [campo]: valor } : s));
    } catch (err) {
      console.error('Error actualizando campo:', err);
    }
  };

  const handleEliminarServicio = async (id) => {
    if (!confirm('¿Deseas eliminar este tratamiento de la lista del bot?')) return;
    try {
      const res = await authFetch(`${API_ENDPOINTS.BOT_CONFIG_SERVICIOS}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setServicios(prev => prev.filter(s => s.id !== id));
        notificarExito('Tratamiento eliminado');
      }
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  // 4. Crear / Actualizar / Eliminar Chatbot FAQ
  const handleSubirAfiche = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendoImagen(true);
    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const res = await authFetch(API_ENDPOINTS.BOT_CONFIG_UPLOAD_AFICHE, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setNuevoChatbot(prev => ({ ...prev, link_imagen: data.url }));
        notificarExito('¡Afiche subido con éxito!');
      } else {
        alert('Error al subir la imagen');
      }
    } catch (err) {
      alert('Error de conexión subiendo afiche');
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleCrearChatbotItem = async (e) => {
    e.preventDefault();
    if (!nuevoChatbot.intencion.trim() || !nuevoChatbot.respuesta.trim()) {
      return alert('Completa los campos obligatorios');
    }

    try {
      const res = await authFetch(API_ENDPOINTS.BOT_CONFIG_CHATBOT, {
        method: 'POST',
        body: JSON.stringify(nuevoChatbot)
      });
      if (res.ok) {
        setModalChatbot(false);
        setNuevoChatbot({ intencion: '', palabras_clave: '', respuesta: '', link_imagen: '' });
        notificarExito('Respuesta automática creada');
        cargarDatos();
      }
    } catch (err) {
      alert('Error creando respuesta');
    }
  };

  const handleActualizarChatbotCampo = async (id, campo, valor) => {
    try {
      await authFetch(`${API_ENDPOINTS.BOT_CONFIG_CHATBOT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ [campo]: valor })
      });
      setChatbotItems(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c));
    } catch (err) {
      console.error('Error actualizando chatbot item:', err);
    }
  };

  const handleEliminarChatbotItem = async (id) => {
    if (!confirm('¿Deseas eliminar esta respuesta automática?')) return;
    try {
      const res = await authFetch(`${API_ENDPOINTS.BOT_CONFIG_CHATBOT}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setChatbotItems(prev => prev.filter(c => c.id !== id));
        notificarExito('Respuesta eliminada');
      }
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  // 5. Restaurar plantilla oficial de fábrica
  const handleRestaurarPlantilla = async () => {
    const confirmacion = confirm(
      '⚠️ ¿Estás seguro de restablecer tu bot a los valores iniciales de fábrica?\n\n' +
      'Esto reescribirá tus servicios y horarios con la plantilla odontológica recomendada.'
    );
    if (!confirmacion) return;

    setCargando(true);
    try {
      const res = await authFetch(API_ENDPOINTS.BOT_CONFIG_RESTAURAR, { method: 'POST' });
      if (res.ok) {
        alert('✅ ¡Tu bot ha sido restaurado con la plantilla base oficial!');
        cargarDatos();
      } else {
        alert('Error al restaurar');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto py-8 px-4 text-black">
        
        {/* Cabecera Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200">
              <Bot size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Personalización del Bot</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                Ajusta los precios en COP, horarios y afiches que tu bot responde en WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestaurarPlantilla}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Restablecer plantilla inicial recomendada"
            >
              <RotateCcw size={14} />
              <span>Restaurar Plantilla</span>
            </button>
            <button
              onClick={cargarDatos}
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
              title="Refrescar datos"
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Notificación de Éxito */}
        {mensajeExito && (
          <div className="mb-6 p-4 bg-green-500 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-green-100 animate-in fade-in slide-in-from-top-2">
            <Check size={16} />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Selector de Pestañas Estilo Apple */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 mb-8 max-w-xl mx-auto">
          <button
            onClick={() => setTabActiva('servicios')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === 'servicios' ? 'bg-white shadow-md text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign size={16} /> Catálogo y Tarifas ({servicios.length})
          </button>
          <button
            onClick={() => setTabActiva('horarios')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === 'horarios' ? 'bg-white shadow-md text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock size={16} /> Sede y Horarios
          </button>
          <button
            onClick={() => setTabActiva('promos')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === 'promos' ? 'bg-white shadow-md text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles size={16} /> Promos y Afiches ({chatbotItems.length})
          </button>
        </div>

        {/* CONTENIDO 1: CATÁLOGO Y TARIFAS */}
        {tabActiva === 'servicios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-gray-900">Tratamientos Clínicos y Precios (COP)</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Cuando un paciente pregunte por un tratamiento, el bot responderá al instante con este precio exacto.
                </p>
              </div>
              <button
                onClick={() => setModalServicio(true)}
                className="px-5 py-3 bg-black text-white hover:bg-gray-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-gray-200 cursor-pointer"
              >
                <Plus size={16} />
                <span>Agregar Tratamiento</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicios.map((srv) => (
                <div key={srv.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {srv.categoria || 'General'}
                        </span>
                        <h3 className="text-base font-black text-gray-900 mt-2">{srv.servicio}</h3>
                      </div>
                      <button
                        onClick={() => handleEliminarServicio(srv.id)}
                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar tratamiento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Precio en COP</label>
                      <input
                        type="text"
                        defaultValue={srv.precio}
                        onBlur={(e) => handleActualizarServicioCampo(srv.id, 'precio', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-green-700 focus:bg-white focus:ring-2 focus:ring-black/10 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Descripción / Qué incluye</label>
                      <textarea
                        rows={2}
                        defaultValue={srv.descripcion}
                        onBlur={(e) => handleActualizarServicioCampo(srv.id, 'descripcion', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs text-gray-600 focus:bg-white focus:ring-2 focus:ring-black/10 outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-bold">
                    <span>Guardado automático al editar</span>
                    <span className="text-green-600 font-black">● Activo en Bot</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO 2: SEDE Y HORARIOS */}
        {tabActiva === 'horarios' && (
          <form onSubmit={handleGuardarGeneral} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Building size={20} className="text-gray-600" /> Información del Consultorio y Ubicación
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Gemini IA y el bot usarán estos datos cuando los pacientes pregunten dónde quedan, teléfonos o cómo llegar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Nombre del Consultorio / Clínica</label>
                <input
                  type="text"
                  value={configGeneral.nombre_consultorio || ''}
                  onChange={(e) => setConfigGeneral({ ...configGeneral, nombre_consultorio: e.target.value })}
                  placeholder="Ej: Odontología Especializada Dr. Pérez"
                  className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-black/10 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Ciudad y Barrio</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={configGeneral.ciudad || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, ciudad: e.target.value })}
                    placeholder="Medellín"
                    className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-black/10 outline-none"
                  />
                  <input
                    type="text"
                    value={configGeneral.barrio || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, barrio: e.target.value })}
                    placeholder="Barrio / Sector"
                    className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-black/10 outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Dirección Completa / Sede</label>
                <input
                  type="text"
                  value={configGeneral.direccion || ''}
                  onChange={(e) => setConfigGeneral({ ...configGeneral, direccion: e.target.value })}
                  placeholder="Ej: Cra 84 # 42C-19, Local 2, La América"
                  className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-medium text-sm focus:ring-2 focus:ring-black/10 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Teléfono de Contacto / WhatsApp</label>
                <input
                  type="text"
                  value={configGeneral.telefono || ''}
                  onChange={(e) => setConfigGeneral({ ...configGeneral, telefono: e.target.value, whatsapp: e.target.value, telefonos: e.target.value })}
                  placeholder="300 123 4567"
                  className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-mono font-bold text-sm focus:ring-2 focus:ring-black/10 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Correo Electrónico Clínico</label>
                <input
                  type="email"
                  value={configGeneral.email || ''}
                  onChange={(e) => setConfigGeneral({ ...configGeneral, email: e.target.value })}
                  placeholder="contacto@consultorio.com"
                  className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-medium text-sm focus:ring-2 focus:ring-black/10 outline-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2 mb-4">
                <Clock size={18} className="text-gray-600" /> Horarios de Atención al Paciente
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Lunes a Viernes</label>
                  <input
                    type="text"
                    value={configGeneral.horario_lunes_viernes || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, horario_lunes_viernes: e.target.value })}
                    placeholder="9:00 AM - 12:00 PM / 2:00 PM - 6:00 PM"
                    className="w-full p-3 bg-gray-50 rounded-xl border-none font-medium text-xs focus:ring-2 focus:ring-black/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Sábados</label>
                  <input
                    type="text"
                    value={configGeneral.horario_sabado || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, horario_sabado: e.target.value })}
                    placeholder="9:00 AM - 12:00 PM / 2:00 PM - 5:00 PM"
                    className="w-full p-3 bg-gray-50 rounded-xl border-none font-medium text-xs focus:ring-2 focus:ring-black/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Domingos y Festivos</label>
                  <input
                    type="text"
                    value={configGeneral.horario_domingo || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, horario_domingo: e.target.value })}
                    placeholder="Cerrado"
                    className="w-full p-3 bg-gray-50 rounded-xl border-none font-medium text-xs focus:ring-2 focus:ring-black/10 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2 mb-4">
                <MessageSquare size={18} className="text-gray-600" /> Mensajes de Saludo y Despedida
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mensaje de Bienvenida</label>
                  <textarea
                    rows={2}
                    value={configGeneral.mensaje_bienvenida || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, mensaje_bienvenida: e.target.value })}
                    className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-medium text-sm focus:ring-2 focus:ring-black/10 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mensaje de Despedida</label>
                  <input
                    type="text"
                    value={configGeneral.mensaje_despedida || ''}
                    onChange={(e) => setConfigGeneral({ ...configGeneral, mensaje_despedida: e.target.value })}
                    className="w-full p-3.5 bg-gray-50 rounded-2xl border-none font-medium text-sm focus:ring-2 focus:ring-black/10 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 cursor-pointer"
            >
              <Save size={18} />
              <span>{guardando ? 'Guardando...' : 'Guardar Información de Sede y Horarios'}</span>
            </button>
          </form>
        )}

        {/* CONTENIDO 3: PROMOS Y AFICHES */}
        {tabActiva === 'promos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-gray-900">Preguntas Frecuentes y Afiches con Imagen</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Gestiona las respuestas instantáneas del bot y afiches publicitarios para promociones.
                </p>
              </div>
              <button
                onClick={() => setModalChatbot(true)}
                className="px-5 py-3 bg-black text-white hover:bg-gray-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-gray-200 cursor-pointer"
              >
                <Plus size={16} />
                <span>Nueva Respuesta / Promo</span>
              </button>
            </div>

            <div className="space-y-4">
              {chatbotItems.map((item) => (
                <div key={item.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-xl text-xs font-black uppercase tracking-wider">
                        {item.intencion}
                      </span>
                      {item.link_imagen && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <ImageIcon size={12} /> Afiche Adjunto
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Palabras Clave que activan esta respuesta</label>
                      <input
                        type="text"
                        defaultValue={item.palabras_clave}
                        onBlur={(e) => handleActualizarChatbotCampo(item.id, 'palabras_clave', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Texto de Respuesta</label>
                      <textarea
                        rows={3}
                        defaultValue={item.respuesta}
                        onBlur={(e) => handleActualizarChatbotCampo(item.id, 'respuesta', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {item.link_imagen && (
                    <div className="shrink-0 text-center">
                      <img src={item.link_imagen} alt="Afiche" className="w-32 h-32 object-cover rounded-2xl shadow-md mx-auto mb-2" />
                      <button
                        onClick={() => handleActualizarChatbotCampo(item.id, 'link_imagen', null)}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        Quitar afiche
                      </button>
                    </div>
                  )}

                  <div className="self-end md:self-start">
                    <button
                      onClick={() => handleEliminarChatbotItem(item.id)}
                      className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: NUEVO TRATAMIENTO */}
        {modalServicio && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-lg">Nuevo Tratamiento Clínico</h3>
                <button onClick={() => setModalServicio(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCrearServicio} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Nombre del Tratamiento</label>
                  <input
                    type="text"
                    required
                    value={nuevoServicio.servicio}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, servicio: e.target.value })}
                    placeholder="Ej: Calza en Resina"
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Precio Oficial (COP)</label>
                  <input
                    type="text"
                    required
                    value={nuevoServicio.precio}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, precio: e.target.value })}
                    placeholder="Ej: COP 100.000"
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold text-green-700 border-none outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Descripción / Qué incluye</label>
                  <textarea
                    rows={2}
                    value={nuevoServicio.descripcion}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                    placeholder="Incluye profilaxis y resina de alta estética..."
                    className="w-full p-3 bg-gray-50 rounded-xl text-xs border-none outline-none resize-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Palabras clave (separadas por coma)</label>
                  <input
                    type="text"
                    value={nuevoServicio.palabras_clave}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, palabras_clave: e.target.value })}
                    placeholder="calza, resina, tapadura, calzas"
                    className="w-full p-3 bg-gray-50 rounded-xl text-xs border-none outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg mt-2 cursor-pointer"
                >
                  Guardar Tratamiento
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: NUEVA PREGUNTA / AFICHE */}
        {modalChatbot && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-lg">Nueva Respuesta / Promo</h3>
                <button onClick={() => setModalChatbot(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCrearChatbotItem} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Identificador / Tema</label>
                  <input
                    type="text"
                    required
                    value={nuevoChatbot.intencion}
                    onChange={(e) => setNuevoChatbot({ ...nuevoChatbot, intencion: e.target.value })}
                    placeholder="Ej: promo_navidad, implantes, garantias"
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Palabras clave que la activan</label>
                  <input
                    type="text"
                    required
                    value={nuevoChatbot.palabras_clave}
                    onChange={(e) => setNuevoChatbot({ ...nuevoChatbot, palabras_clave: e.target.value })}
                    placeholder="promo navidad, descuento, oferta fin de año"
                    className="w-full p-3 bg-gray-50 rounded-xl text-xs border-none outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Mensaje de Respuesta</label>
                  <textarea
                    rows={3}
                    required
                    value={nuevoChatbot.respuesta}
                    onChange={(e) => setNuevoChatbot({ ...nuevoChatbot, respuesta: e.target.value })}
                    placeholder="¡Aprovecha nuestro 20% de descuento en blanqueamiento durante este mes! 🎄🦷"
                    className="w-full p-3 bg-gray-50 rounded-xl text-xs border-none outline-none resize-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Afiche Publicitario (Opcional)</label>
                  <label className="w-full p-4 border-2 border-dashed border-gray-200 hover:border-black rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <ImageIcon size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-600">
                      {subiendoImagen ? 'Subiendo imagen...' : nuevoChatbot.link_imagen ? '✓ Afiche cargado' : 'Subir imagen / foto de promoción'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleSubirAfiche} className="hidden" />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={subiendoImagen}
                  className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg mt-2 disabled:opacity-50 cursor-pointer"
                >
                  Guardar Respuesta
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
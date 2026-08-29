'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/config/supabase';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import AuthGuard from '@/components/AuthGuard';
import { useUser } from '@/context/UserContext';
import { 
  Send, Bot, User, Phone, Search, ArrowLeft, ExternalLink, 
  MessageSquare, CheckCheck, RefreshCw, Bell, QrCode,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import ModalConexionWhatsapp from '@/components/whatsapp/ModalConexionWhatsapp';

function ChatContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const numeroUrlParam = searchParams.get('numero');

  // 🆔 Instancia única de este doctor
  const miInstancia = user?.id ? `doctor_${user.id.replace(/-/g, '_')}` : null;

  const [conversaciones, setConversaciones] = useState({});
  const [pacientesMap, setPacientesMap] = useState({});
  const [chatActivo, setChatActivo] = useState(numeroUrlParam || null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalConexionAbierto, setModalConexionAbierto] = useState(false);
  const [permisoNotificacion, setPermisoNotificacion] = useState('default');
  
  // 📄 Paginación (7 chats por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 7;

  const finMensajesRef = useRef(null);
  const pacientesMapRef = useRef({});

  // 1. Permisos de notificación
  const solicitarPermisoNotificaciones = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permiso = await Notification.requestPermission();
      setPermisoNotificacion(permiso);
    }
  };

  const lanzarNotificacionNativa = async (numero, texto, nombrePaciente) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const titulo = nombrePaciente ? `🔔 ${nombrePaciente}` : `🔔 WhatsApp: +${numero}`;
    const opciones = {
      body: texto,
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
      vibrate: [200, 100, 200],
      tag: `msg-${numero}`,
      renotify: true,
      data: { url: `/chat?numero=${numero}` }
    };

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(titulo, opciones);
    } else {
      new Notification(titulo, opciones);
    }
  };

  // 2. Directorio de pacientes del doctor
  const cargarDirectorioPacientes = async () => {
    try {
      const res = await authFetch(`${API_ENDPOINTS.PACIENTES}?per_page=500`);
      if (res.ok) {
        const data = await res.json();
        const mapa = {};
        (data.pacientes || []).forEach(p => {
          if (p.telefono) {
            const telLimpio = p.telefono.replace(/\D/g, '');
            mapa[telLimpio] = p;
            if (telLimpio.length === 10) {
              mapa[`57${telLimpio}`] = p;
            }
          }
        });
        setPacientesMap(mapa);
        pacientesMapRef.current = mapa;
      }
    } catch (err) {
      console.error('Error al cargar directorio de pacientes:', err);
    }
  };

  // 3. Cargar historial filtrado por la instancia del doctor
  const cargarHistorial = async () => {
    if (!miInstancia) return;
    try {
      let query = supabase
        .from('historial')
        .select('*')
        .eq('instance', miInstancia)
        .order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      const agrupados = {};
      (data || []).forEach(row => {
        const num = row.numero;
        if (!agrupados[num]) {
          agrupados[num] = [];
        }
        agrupados[num].push(row);
      });

      setConversaciones(agrupados);

      if (numeroUrlParam && agrupados[numeroUrlParam]) {
        setChatActivo(numeroUrlParam);
      } else if (!chatActivo) {
        const numeros = Object.keys(agrupados);
        if (numeros.length > 0) {
          setChatActivo(numeros[numeros.length - 1]);
        } else {
          setChatActivo(null);
        }
      }
    } catch (err) {
      console.error('Error cargando historial de Supabase:', err);
    } finally {
      setCargando(false);
    }
  };

  // 4. Inicialización y suscripción en tiempo real aislada
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermisoNotificacion(Notification.permission);
    }

    cargarDirectorioPacientes();
    if (miInstancia) {
      cargarHistorial();
    }

    // Escuchar solo mensajes de la instancia de este doctor
    const canal = supabase
      .channel(`chat-realtime-${miInstancia || 'default'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'historial' },
        (payload) => {
          const nuevaFila = payload.new;

          // 🛡️ Filtro de seguridad: ignorar si no pertenece a la instancia de este doctor
          if (miInstancia && nuevaFila.instance && nuevaFila.instance !== miInstancia) {
            return;
          }

          const num = nuevaFila.numero;

          setConversaciones(prev => {
            const chatExistente = prev[num] ? [...prev[num], nuevaFila] : [nuevaFila];
            return {
              ...prev,
              [num]: chatExistente
            };
          });

          const esMensajePaciente = nuevaFila.mensaje_paciente && 
                                    nuevaFila.mensaje_paciente !== '[Intervención Doctor/Humano]';

          if (esMensajePaciente) {
            const pacienteInfo = pacientesMapRef.current[num] || pacientesMapRef.current[num.replace(/^57/, '')];
            const nombreMostrar = pacienteInfo ? `${pacienteInfo.nombres} ${pacienteInfo.apellidos || ''}` : null;
            lanzarNotificacionNativa(num, nuevaFila.mensaje_paciente, nombreMostrar);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [miInstancia]);

  useEffect(() => {
    if (numeroUrlParam) {
      setChatActivo(numeroUrlParam);
    }
  }, [numeroUrlParam]);

  useEffect(() => {
    finMensajesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversaciones, chatActivo]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  // 5. Enviar mensaje manual
  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !chatActivo || enviando) return;

    const textoAEnviar = nuevoMensaje.trim();
    setEnviando(true);

    try {
      const response = await authFetch(API_ENDPOINTS.WHATSAPP_ENVIAR, {
        method: 'POST',
        body: JSON.stringify({
          numero: chatActivo,
          texto: textoAEnviar,
          imagen: null
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error al despachar el mensaje por WhatsApp');
      }

      setNuevoMensaje('');
    } catch (err) {
      alert(`⚠️ ${err.message || 'No se pudo enviar el mensaje'}`);
    } finally {
      setEnviando(false);
    }
  };

  const listaChats = Object.entries(conversaciones).map(([numero, msgs]) => {
    const ultimoMensaje = msgs[msgs.length - 1] || {};
    const infoPaciente = pacientesMap[numero] || pacientesMap[numero.replace(/^57/, '')];
    return {
      numero,
      mensajes: msgs,
      ultimoTexto: ultimoMensaje.respuesta_enviada || ultimoMensaje.mensaje_paciente || 'Mensaje',
      fechaUltimo: ultimoMensaje.created_at,
      paciente: infoPaciente
    };
  }).sort((a, b) => new Date(b.fechaUltimo) - new Date(a.fechaUltimo));

  const chatsFiltrados = listaChats.filter(c => {
    const term = busqueda.toLowerCase();
    const nombre = c.paciente ? `${c.paciente.nombres} ${c.paciente.apellidos}`.toLowerCase() : '';
    return c.numero.includes(term) || nombre.includes(term);
  });

  const totalPaginas = Math.max(1, Math.ceil(chatsFiltrados.length / ITEMS_POR_PAGINA));
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const chatsPaginados = chatsFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

  const chatActivoInfo = listaChats.find(c => c.numero === chatActivo);
  const mensajesActivos = conversaciones[chatActivo] || [];

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto h-[calc(100vh-5.5rem)] flex flex-col p-2 sm:p-4 text-black">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">Bandeja de WhatsApp</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Atención híbrida: Bot 24/7 + Intervención Doctor
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalConexionAbierto(true)}
              className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm shadow-green-100 cursor-pointer"
              title="Estado / Vincular WhatsApp"
            >
              <QrCode size={14} />
              <span className="hidden sm:inline">Vincular WhatsApp</span>
            </button>

            {permisoNotificacion !== 'granted' && (
              <button 
                onClick={solicitarPermisoNotificaciones}
                className="p-2.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl hover:bg-yellow-100 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                title="Activar alertas sonoras"
              >
                <Bell size={14} />
                <span className="hidden sm:inline">Activar Notificaciones</span>
              </button>
            )}

            <button 
              onClick={cargarHistorial} 
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
              title="Refrescar bandeja"
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Contenedor del Chat */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex">
          
          {/* Columna Izquierda (Lista de Chats del Doctor) */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/50 ${chatActivo ? 'hidden md:flex' : 'flex'}`}>
            
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar paciente o número..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/10 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {cargando ? (
                <div className="p-8 text-center text-gray-400 text-sm animate-pulse">
                  Cargando conversaciones...
                </div>
              ) : chatsPaginados.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No hay conversaciones activas
                </div>
              ) : (
                chatsPaginados.map((item) => {
                  const esActivo = item.numero === chatActivo;
                  const nombreMostrar = item.paciente 
                    ? `${item.paciente.nombres} ${item.paciente.apellidos || ''}`
                    : `+${item.numero}`;

                  return (
                    <div
                      key={item.numero}
                      onClick={() => setChatActivo(item.numero)}
                      className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 hover:bg-white ${
                        esActivo ? 'bg-white border-l-4 border-black shadow-sm' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                        item.paciente ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {item.paciente ? <User size={16} /> : <Phone size={15} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="font-bold text-sm text-gray-900 truncate capitalize">
                            {nombreMostrar.toLowerCase()}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">
                            {item.fechaUltimo ? new Date(item.fechaUltimo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate leading-snug">
                          {item.ultimoTexto}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalPaginas > 1 && (
              <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  Pág. {paginaActual} de {totalPaginas} ({chatsFiltrados.length} chats)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Columna Derecha (Chat Activo) */}
          <div className={`flex-1 flex flex-col bg-white ${!chatActivo ? 'hidden md:flex' : 'flex'}`}>
            {chatActivo ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setChatActivo(null)} 
                      className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">
                      {chatActivoInfo?.paciente ? <User size={18} /> : <Phone size={18} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-gray-900 capitalize">
                          {chatActivoInfo?.paciente 
                            ? `${chatActivoInfo.paciente.nombres} ${chatActivoInfo.paciente.apellidos || ''}`.toLowerCase()
                            : `+${chatActivo}`}
                        </h3>
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono font-bold">
                        +{chatActivo}
                      </p>
                    </div>
                  </div>

                  {chatActivoInfo?.paciente && (
                    <Link
                      href={`/pacientes/${chatActivoInfo.paciente.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                    >
                      <span>Ver Ficha</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>

                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/40">
                  {mensajesActivos.map((m) => {
                    const esIntervencionHumana = m.mensaje_paciente === '[Intervención Doctor/Humano]';
                    const tieneMensajePaciente = m.mensaje_paciente && !esIntervencionHumana;
                    const tieneRespuesta = m.respuesta_enviada && m.respuesta_enviada.trim() !== '';

                    return (
                      <div key={m.id} className="space-y-3">
                        {tieneMensajePaciente && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] sm:max-w-md bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Paciente</p>
                              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                                {m.mensaje_paciente}
                              </p>
                              <span className="block text-[10px] text-gray-400 text-right mt-1 font-mono">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )}

                        {tieneRespuesta && (
                          <div className="flex justify-end">
                            <div className={`max-w-[85%] sm:max-w-md text-white rounded-2xl rounded-tr-sm p-3.5 shadow-md ${
                              esIntervencionHumana 
                                ? 'bg-blue-600 shadow-blue-100' 
                                : 'bg-zinc-950 shadow-gray-200'
                            }`}>
                              <div className="flex items-center justify-between gap-2 mb-1 border-b border-white/10 pb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 opacity-90">
                                  {esIntervencionHumana ? (
                                    <>👨‍⚕️ Dr. (Respuesta Manual)</>
                                  ) : (
                                    <><Bot size={12} /> Asistente Virtual (Bot)</>
                                  )}
                                </span>
                                <CheckCheck size={12} className="text-green-300" />
                              </div>

                              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                                {m.respuesta_enviada}
                              </p>

                              <span className="block text-[10px] text-white/60 text-right mt-1 font-mono">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={finMensajesRef} />
                </div>

                <form onSubmit={handleEnviarMensaje} className="p-3 sm:p-4 border-t border-gray-100 bg-white flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Escribe una respuesta como Doctor..."
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    disabled={enviando}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-black/10 outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={enviando || !nuevoMensaje.trim()}
                    className="p-3 bg-black hover:bg-gray-800 text-white rounded-2xl transition-all shadow-lg shadow-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <MessageSquare size={48} className="text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-700">Selecciona una conversación</h3>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  Aquí podrás ver el historial de WhatsApp y responder directamente a tus pacientes en vivo.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      <ModalConexionWhatsapp
        abierto={modalConexionAbierto}
        onCerrar={() => setModalConexionAbierto(false)}
      />

    </AuthGuard>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 font-bold">Cargando bandeja de WhatsApp...</div>}>
      <ChatContent />
    </Suspense>
  );
}
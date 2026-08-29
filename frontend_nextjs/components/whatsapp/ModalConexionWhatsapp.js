'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';
import { QrCode, CheckCircle2, RefreshCw, Smartphone, LogOut, X, AlertCircle } from 'lucide-react';

export default function ModalConexionWhatsapp({ abierto, onCerrar }) {
  const [estado, setEstado] = useState('cargando'); // 'cargando', 'conectado', 'desconectado', 'esperando_qr'
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const intervalPollingRef = useRef(null);

  // 1. Consultar estado actual
  const consultarEstado = async () => {
    try {
      const res = await authFetch(API_ENDPOINTS.WHATSAPP_ESTADO);
      if (res.ok) {
        const data = await res.json();
        if (data.conectado) {
          setEstado('conectado');
          setQrCode(null);
          detenerPolling();
        } else {
          setEstado('desconectado');
        }
      }
    } catch (err) {
      console.error('[WhatsApp Modal] Error consultando estado:', err);
    }
  };

  // 2. Solicitar QR de conexión
  const iniciarConexion = async () => {
    setCargandoAccion(true);
    setErrorMsg(null);
    try {
      const res = await authFetch(API_ENDPOINTS.WHATSAPP_CONECTAR, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.qrcode) {
        let base64Img = data.qrcode;
        if (!base64Img.startsWith('data:image')) {
          base64Img = `data:image/png;base64,${base64Img}`;
        }
        setQrCode(base64Img);
        setPairingCode(data.pairingCode || null);
        setEstado('esperando_qr');
        iniciarPolling();
      } else if (res.ok && data.status === 'open') {
        setEstado('conectado');
        detenerPolling();
      } else {
        setErrorMsg(data.detail || 'No se pudo generar el código QR.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setCargandoAccion(false);
    }
  };

  // 3. Desconectar sesión
  const handleDesconectar = async () => {
    if (!confirm('¿Deseas desconectar este número de WhatsApp de CloudentApp?')) return;

    setCargandoAccion(true);
    try {
      const res = await authFetch(API_ENDPOINTS.WHATSAPP_DESCONECTAR, { method: 'POST' });
      if (res.ok) {
        setEstado('desconectado');
        setQrCode(null);
        detenerPolling();
      }
    } catch (err) {
      alert('Error al desconectar');
    } finally {
      setCargandoAccion(false);
    }
  };

  // Polling para detectar cuando el doctor escanea el QR
  const iniciarPolling = () => {
    detenerPolling();
    intervalPollingRef.current = setInterval(async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.WHATSAPP_ESTADO);
        if (res.ok) {
          const data = await res.json();
          if (data.conectado) {
            setEstado('conectado');
            setQrCode(null);
            detenerPolling();
          }
        }
      } catch (e) {
        console.error('[Polling WhatsApp]', e);
      }
    }, 3000);
  };

  const detenerPolling = () => {
    if (intervalPollingRef.current) {
      clearInterval(intervalPollingRef.current);
      intervalPollingRef.current = null;
    }
  };

  useEffect(() => {
    if (abierto) {
      setEstado('cargando');
      consultarEstado();
    } else {
      detenerPolling();
      setQrCode(null);
    }
    return () => detenerPolling();
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden text-black animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Conexión de WhatsApp</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Evolution API</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-6 text-center">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2 text-left">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {estado === 'cargando' && (
            <div className="py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verificando estado...</p>
            </div>
          )}

          {estado === 'conectado' && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100 animate-in zoom-in">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="font-black text-xl text-gray-900">¡WhatsApp Conectado!</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Tu número está vinculado activamente. Tus pacientes recibirán respuestas automáticas y podrás chatear con ellos desde la bandeja.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={consultarEstado}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Refrescar
                </button>
                <button
                  onClick={handleDesconectar}
                  disabled={cargandoAccion}
                  className="py-3 px-5 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogOut size={14} /> Desconectar
                </button>
              </div>
            </div>
          )}

          {estado === 'desconectado' && (
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <QrCode size={32} />
              </div>
              <div>
                <h4 className="font-black text-lg text-gray-900">WhatsApp no vinculado</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Haz clic en el botón para generar un código QR y escanéalo con tu WhatsApp (Dispositivos vinculados).
                </p>
              </div>

              <button
                onClick={iniciarConexion}
                disabled={cargandoAccion}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cargandoAccion ? <RefreshCw size={16} className="animate-spin" /> : <QrCode size={16} />}
                <span>{cargandoAccion ? 'Generando QR...' : 'Vincular WhatsApp por QR'}</span>
              </button>
            </div>
          )}

          {estado === 'esperando_qr' && qrCode && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 inline-block">
                <img src={qrCode} alt="Código QR de WhatsApp" className="w-64 h-64 mx-auto rounded-2xl shadow-md" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
                  Escanea desde tu WhatsApp
                </p>
                <p className="text-[11px] text-gray-400">
                  Abre WhatsApp &gt; Ajustes &gt; Dispositivos vinculados &gt; Vincular un dispositivo.
                </p>
              </div>

              {pairingCode && (
                <div className="bg-blue-50 text-blue-800 p-3 rounded-2xl text-xs font-mono font-bold">
                  Código de emparejamiento: {pairingCode}
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={iniciarConexion}
                  disabled={cargandoAccion}
                  className="py-2.5 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={12} className={cargandoAccion ? 'animate-spin' : ''} />
                  <span>Nuevo QR</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
// config/api.js

export const API_BASE_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:8001'
  : 'https://dental-backend-779789369655.us-east1.run.app';



export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    token ? localStorage.setItem('auth_token', token) : localStorage.removeItem('auth_token');
  }
};

export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // 🔥 IMPORTANTE: Asegurar que la URL no termine con espacios o caracteres raros
  const cleanUrl = url.trim();
  return fetch(cleanUrl, { ...options, headers });
};

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  PERFIL_USUARIO: `${API_BASE_URL}/api/usuarios/me`,
  CITAS_POR_FECHA: (fecha) => `${API_BASE_URL}/api/citas/por-fecha?fecha=${fecha}`,
  DASHBOARD_HOME_DATA: (params = "") => `${API_BASE_URL}/api/dashboard/home-data${params}`,
  NUEVA_CITA: `${API_BASE_URL}/api/citas`,
  EDITAR_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  ELIMINAR_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  OBTENER_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  CITAS_EVENTOS: `${API_BASE_URL}/api/citas/eventos`,
  PACIENTES: `${API_BASE_URL}/api/pacientes/`,
  PACIENTE_BY_ID: (id) => `${API_BASE_URL}/api/pacientes/${id}`,
  EVOLUCIONES_BY_PACIENTE: (id) => `${API_BASE_URL}/api/evoluciones/pacientes/${id}`,
  NUEVA_EVOLUCION: `${API_BASE_URL}/api/evoluciones`,
  NUEVO_PAGO: `${API_BASE_URL}/api/pagos/nuevo`,
  OBTENER_PAGO: (id) => `${API_BASE_URL}/api/pagos/${id}`,
  LISTAR_PAGOS: (params = "") => `${API_BASE_URL}/api/pagos/${params}`,
  EXPORTAR_PACIENTE_WORD: (id) => `${API_BASE_URL}/api/pacientes/${id}/exportar-word`,
  EXPORTAR_BACKUP_EXCEL: `${API_BASE_URL}/api/pacientes/exportar-excel-backup`,
  PLANES: `${API_BASE_URL}/api/planes/`,
  REPORTAR_PAGO: `${API_BASE_URL}/api/pagos/reportar`,
  ACTIVAR_MANUAL: (id) => `${API_BASE_URL}/api/pagos/admin/activar-manual/${id}`,
  SUSPENDER_MANUAL: (id) => `${API_BASE_URL}/api/pagos/admin/suspender-manual/${id}`,
  ADMIN_PAGOS_PENDIENTES: `${API_BASE_URL}/api/pagos/admin/pendientes`,
  APROBAR_PAGO: (id) => `${API_BASE_URL}/api/pagos/admin/aprobar/${id}`,
  RECHAZAR_PAGO: (id) => `${API_BASE_URL}/api/pagos/admin/rechazar/${id}`, // <--- AÑADE ESTA
  ADMIN_RESUMEN_USUARIOS: `${API_BASE_URL}/api/pagos/admin/usuarios-resumen`,
  ACTUALIZAR_PERFIL: `${API_BASE_URL}/api/usuarios/me`,
  CAMBIAR_PASSWORD: `${API_BASE_URL}/api/usuarios/cambiar-password`,
  // WhatsApp Evolution API
  WHATSAPP_ESTADO: `${API_BASE_URL}/api/whatsapp/estado`,
  WHATSAPP_CONECTAR: `${API_BASE_URL}/api/whatsapp/conectar`,
  WHATSAPP_DESCONECTAR: `${API_BASE_URL}/api/whatsapp/desconectar`,
  WHATSAPP_ENVIAR: `${API_BASE_URL}/api/whatsapp/enviar-mensaje`,
};

/**
 * Optimiza una URL de Cloudinary inyectando parámetros de transformación.
 * @param {string} url - URL original de la imagen
 * @param {number} width - Ancho deseado
 * @param {number} quality - Calidad (default auto)
 * @returns {string} URL transformada
 */
export const optimizarImagen = (url, width = 800) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // f_auto: elige el formato más ligero (WebP/AVIF) según el navegador
  // q_auto: comprime la imagen sin pérdida visual perceptible
  // w_XXX: redimensiona al ancho exacto
  // c_limit: no agranda la imagen si es más pequeña que el ancho pedido
  const transformacion = `f_auto,q_auto,w_${width},c_limit`;
  
  // Insertamos la transformación después de '/upload/'
  return url.replace('/upload/', `/upload/${transformacion}/`);
};

/**
 * Parsea de forma segura cualquier respuesta de la API (su éxito o error)
 * y previene que la UI se congele si la respuesta no es exitosa (ej: 403 Plan Expirado, 401 No Autorizado).
 */
export const parseApiResponse = async (response) => {
  try {
    const data = await response.json();
    if (!response.ok) {
      // Extrae el mensaje 'detail' enviado por FastAPI o un mensaje por defecto
      const errorMessage = typeof data.detail === 'string' 
        ? data.detail 
        : 'Ocurrió un error al procesar la solicitud.';
      return { ok: false, error: errorMessage, data: null, status: response.status };
    }
    return { ok: true, error: null, data, status: response.status };
  } catch (e) {
    // Manejo de respuestas vacías o no-JSON
    return {
      ok: response.ok,
      error: response.ok ? null : 'Error imprevisto en la comunicación con el servidor.',
      data: null,
      status: response.status
    };
  }
};
// config/api.js

// 1. Lógica de URL: Usa la variable de entorno o la IP local por defecto
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.7:8001';

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, ""); 

const FIXED_TOKEN = 'test_token_123';

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('auth_token');
    return storedToken || FIXED_TOKEN;
  }
  return FIXED_TOKEN;
};

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    token ? localStorage.setItem('auth_token', token) : localStorage.removeItem('auth_token');
  }
};

// 2. Fetch autenticado sin rastros de Ngrok
export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  return fetch(url, { ...options, headers });
};

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  CITAS_POR_FECHA: (fecha) => `${API_BASE_URL}/api/citas/por-fecha?fecha=${fecha}`,
  DASHBOARD_HOME_DATA: `${API_BASE_URL}/api/dashboard/home-data/`,
  NUEVA_CITA: `${API_BASE_URL}/api/citas`,
  EDITAR_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  ELIMINAR_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  OBTENER_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  CITAS_EVENTOS: `${API_BASE_URL}/api/citas/eventos`,
  PACIENTES: `${API_BASE_URL}/api/pacientes`,
  PACIENTE_BY_ID: (id) => `${API_BASE_URL}/api/pacientes/${id}`,
  EVOLUCIONES_BY_PACIENTE: (id) => `${API_BASE_URL}/api/evoluciones/paciente/${id}`,
  NUEVA_EVOLUCION: `${API_BASE_URL}/api/evoluciones`,
  NUEVO_PAGO: `${API_BASE_URL}/api/pagos/nuevo`,
  OBTENER_PAGO: (id) => `${API_BASE_URL}/api/pagos/${id}`,
  LISTAR_PAGOS: `${API_BASE_URL}/api/pagos`, // Endpoint para el historial
};
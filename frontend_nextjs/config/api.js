// config/api.js
export const API_BASE_URL = 'http://localhost:8001';

// Token fijo para desarrollo
const FIXED_TOKEN = 'test_token_123';

// === NUEVAS FUNCIONES PARA AUTH ===
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    // Intenta obtener token de localStorage, si no existe usa el fijo
    const storedToken = localStorage.getItem('auth_token');
    return storedToken || FIXED_TOKEN;
  }
  return FIXED_TOKEN;
};

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
};
// ================================

export const authFetch = async (url, options = {}) => {
  const token = getAuthToken(); // Usar la nueva función en lugar de FIXED_TOKEN
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  return response;
};

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  CITAS_POR_FECHA: (fecha) => `${API_BASE_URL}/api/citas/por-fecha?fecha=${fecha}`,
  DASHBOARD_HOME_DATA: `${API_BASE_URL}/api/dashboard/home-data`,
  NUEVA_CITA: `${API_BASE_URL}/api/citas`,
  EDITAR_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  ELIMINAR_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  OBTENER_CITA: (id) => `${API_BASE_URL}/api/citas/${id}`,
  CITAS_EVENTOS: `${API_BASE_URL}/api/citas/eventos`,
  PACIENTES: `${API_BASE_URL}/api/pacientes`,
  PACIENTE_BY_ID: (id) => `${API_BASE_URL}/api/pacientes/${id}`,
};
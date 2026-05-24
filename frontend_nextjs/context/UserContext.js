'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarUsuario = async () => {
    // Usamos un AbortController para evitar que la petición se quede colgada indefinidamente en el celular
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 segundos de límite (timeout)

    try {
      const res = await authFetch(API_ENDPOINTS.PERFIL_USUARIO, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        
        // Guardamos los datos del usuario en caché
        localStorage.setItem('user_data_cache', JSON.stringify(data));
        
        if (data.permissions) {
          localStorage.setItem('user_permissions', JSON.stringify(data.permissions));
        }
        
        if (data.is_admin !== undefined) {
          localStorage.setItem('is_admin', data.is_admin);
        }
      } else {
        // Si el token es inválido (ej: expiró), limpiamos de forma segura
        limpiarSesionLocal();
      }
    } catch (err) {
      console.error("Error cargando usuario (red/timeout):", err);
      // NOTA CRÍTICA PARA MÓVILES: Si hay un error de red o timeout, NO cerramos la sesión.
      // Dejamos que el usuario siga usando la app con los datos que ya tenemos en caché.
      const cached = localStorage.getItem('user_data_cache');
      if (cached && !user) {
        setUser(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  const limpiarSesionLocal = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data_cache');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem('is_admin');
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const cached = localStorage.getItem('user_data_cache');

    // Si hay caché, lo cargamos de inmediato para que la UI responda al instante en el celular
    if (cached) {
      setUser(JSON.parse(cached));
    }

    if (token) {
      cargarUsuario(); // Validamos y actualizamos en segundo plano
    } else {
      limpiarSesionLocal();
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading, refreshUser: cargarUsuario, logout: limpiarSesionLocal }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
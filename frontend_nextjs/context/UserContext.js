'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarUsuario = async () => {
    // Usamos un AbortController para evitar que la petición se quede colgada en el celular
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 segundos de límite

    try {
      const res = await authFetch(API_ENDPOINTS.PERFIL_USUARIO, {
        signal: controller.signal
      });

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
      } else if (res.status === 401) {
        // Solo cerramos sesión si el token realmente expiró o es inválido
        limpiarSesionLocal();
      } else {
        // Ante errores de servidor (500, 502, 503), mantenemos los datos en caché para no expulsar al doctor
        const cached = localStorage.getItem('user_data_cache');
        if (cached && !user) {
          try {
            setUser(JSON.parse(cached));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error("Error cargando usuario (red/timeout):", err);
      // Fallback a caché en caso de fallo de red o timeout en móviles
      const cached = localStorage.getItem('user_data_cache');
      if (cached && !user) {
        try {
          setUser(JSON.parse(cached));
        } catch (_) {}
      }
    } finally {
      clearTimeout(timeoutId);
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

    // Si hay caché seguro, lo cargamos de inmediato para respuesta instantánea en celular
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch (_) {
        localStorage.removeItem('user_data_cache');
      }
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
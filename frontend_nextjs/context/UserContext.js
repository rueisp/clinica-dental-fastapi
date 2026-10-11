'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { authFetch, API_ENDPOINTS } from '@/config/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarUsuario = async () => {
    // Tolerancia ampliada a 20 segundos para soportar el arranque en frío (Cold Start) de Cloud Run
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
        // Ante errores de servidor o gateway (500, 502, 503, 504), respaldamos con caché para no expulsar al doctor
        const cached = localStorage.getItem('user_data_cache');
        if (cached && !user) {
          try {
            setUser(JSON.parse(cached));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error("Error cargando usuario (red/timeout serverless):", err);
      // Fallback a caché local en caso de timeout de arranque en frío
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

    // Si hay caché seguro, lo cargamos de inmediato para renderizado instantáneo en celular
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch (_) {
        localStorage.removeItem('user_data_cache');
      }
    }

    if (token) {
      cargarUsuario(); // Validamos y actualizamos con el backend en segundo plano
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
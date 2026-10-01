'use client';
import { useState } from 'react';
import Link from 'next/link';
import { API_ENDPOINTS, setAuthToken } from '@/config/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // 1. Purgar caché previa para garantizar datos limpios del nuevo doctor
        localStorage.removeItem('user_data_cache');

        // 2. Guardar el nuevo token para las peticiones API
        setAuthToken(data.access_token);
        
        // 3. Guardar información básica para persistencia
        localStorage.setItem('user_nombres', data.nombres);
        localStorage.setItem('is_admin', data.is_admin);

        if (data.permissions) {
          localStorage.setItem('user_permissions', JSON.stringify(data.permissions));
        }

        console.log('✅ Login exitoso, redirigiendo...');
        
        // Recarga completa para que UserContext inicialice limpio con la nueva sesión
        window.location.href = '/dashboard'; 
      } else {
        const errorMsg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail[0]?.msg : 'Error al iniciar sesión');
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión con el servidor. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Clínica Dental</h1>
        <h2 className="text-xl mb-4 text-center">Iniciar Sesión</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        
        <div className="mt-6 text-sm text-gray-500 text-center space-y-2">
          <p>
            ¿No tienes una cuenta?{' '}
            <Link href="/registro" className="text-blue-600 font-bold hover:underline">
              Regístrate aquí
            </Link>
          </p>
          <p>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
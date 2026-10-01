"use client";
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_ENDPOINTS, setAuthToken } from '@/config/api';

function RegistroForm() {
    const searchParams = useSearchParams();
    const planIdFromUrl = searchParams.get('plan_id');
    const planNombreFromUrl = searchParams.get('plan_nombre');
    const monedaFromUrl = searchParams.get('moneda') || 'COP';

    const [formData, setFormData] = useState({
        nombres: '',
        username: '',
        email: '',
        password: '',
        plan_id: planIdFromUrl || null
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch(API_ENDPOINTS.REGISTER, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorMsg = typeof data.detail === 'string'
                    ? data.detail
                    : (Array.isArray(data.detail) ? data.detail[0]?.msg : 'Error al registrar la cuenta');
                setError(errorMsg);
                return;
            }

            // 1. Purgar caché previa para garantizar datos limpios del nuevo doctor
            localStorage.removeItem('user_data_cache');

            // 2. Guardar el token de autenticación
            setAuthToken(data.access_token);
            
            // 3. Guardar el nombre para el saludo del Dashboard
            localStorage.setItem("nombre_usuario", data.nombre_usuario);

            // 4. Guardar los permisos del plan en localStorage
            if (data.permissions) {
                localStorage.setItem("user_permissions", JSON.stringify(data.permissions));
            }

            // 5. Redirección inteligente según el plan elegido en la Landing
            const esPlanDePago = planIdFromUrl && planNombreFromUrl && planNombreFromUrl.toLowerCase() !== 'trial';

            if (esPlanDePago) {
                window.location.href = `/planes/reportar?plan_id=${planIdFromUrl}&plan_nombre=${planNombreFromUrl}&moneda=${monedaFromUrl}`;
            } else {
                window.location.href = "/dashboard"; 
            }

        } catch (err) {
            console.error('Register error:', err);
            setError('Error de conexión con el servidor. Verifica tu red.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-center text-3xl font-bold">Crear Cuenta</h2>
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                    <input name="nombres" placeholder="Nombre" required className="w-full p-3 border rounded-lg" onChange={handleChange} />
                    <input name="username" placeholder="Usuario" required className="w-full p-3 border rounded-lg" onChange={handleChange} />
                    <input name="email" type="email" placeholder="Email" required className="w-full p-3 border rounded-lg" onChange={handleChange} />
                    <input name="password" type="password" placeholder="Contraseña" required className="w-full p-3 border rounded-lg" onChange={handleChange} />
                    
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition cursor-pointer disabled:opacity-50">
                        {loading ? "Cargando..." : "REGISTRARME"}
                    </button>
                </form>

                <div className="mt-6 text-sm text-gray-500 text-center space-y-2">
                    <p>
                        ¿Ya tienes una cuenta?{' '}
                        <Link href="/login" className="text-blue-600 font-bold hover:underline">
                            Inicia sesión aquí
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

export default function RegistroPage() {
    return <Suspense fallback={<div>Cargando...</div>}><RegistroForm /></Suspense>;
}
"use client";
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Importamos tus propias funciones del archivo config/api.js
import { API_ENDPOINTS, setAuthToken } from '@/config/api';

function RegistroForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planIdFromUrl = searchParams.get('plan_id');

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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Error en el registro");
            }

            // 1. Guardar el token con tu función global
            setAuthToken(data.access_token);
            
            // 2. Guardar el nombre para el saludo del Dashboard
            localStorage.setItem("nombre_usuario", data.nombre_usuario);

            // 🔥 3. NUEVO: Guardar los permisos del plan en localStorage
            if (data.permissions) {
                localStorage.setItem("user_permissions", JSON.stringify(data.permissions));
            }

            // 4. Redirección limpia
            window.location.href = "/dashboard"; 

        } catch (err) {
            // Si el error es un objeto de FastAPI (422), extraemos el mensaje
            if (typeof err.message === 'object') {
                setError(JSON.stringify(err.message));
            } else {
                setError(err.message);
            }
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
                    
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">
                        {loading ? "Cargando..." : "REGISTRARME"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function RegistroPage() {
    return <Suspense fallback={<div>Cargando...</div>}><RegistroForm /></Suspense>;
}
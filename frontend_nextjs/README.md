# 🦷 CloudentApp - Frontend (Next.js 16)

Interfaz clínica y operativa web de **CloudentApp**, plataforma SaaS integral para consultorios odontológicos. Construida con **Next.js 16 (App Router)**, **React 19** y **Tailwind CSS v4**, optimizada para operar con latencia mínima tanto en computadores de escritorio como en tabletas y dispositivos móviles.

---

## 🛠️ Tecnologías y Dependencias

* **Framework:** Next.js 16 (App Router, Standalone Output).
* **UI & Estilos:** Tailwind CSS v4, Lucide React Icons.
* **Componentes Clínicos:** 
  * FullCalendar (Agenda diaria y mensual con interfaz táctil).
  * Odontograma interactivo digital SVG para adultos y niños.
  * Transcripción y dictado de evoluciones clínicas por voz (Web Speech API).
* **Bandeja de WhatsApp en Vivo:** Supabase Realtime (WebSockets) para mensajería bidireccional y notificaciones PWA nativas.
* **Despliegue:** Docker Multi-stage compilado para Google Cloud Run Serverless (`us-east1`).

---

## ⚙️ Variables de Entorno (`.env.local`)

Crea un archivo `.env.local` en la raíz de `frontend_nextjs/` con la configuración del backend y Supabase:

```env
# URL de la API de FastAPI (Local o Cloud Run)
NEXT_PUBLIC_API_URL=http://localhost:8001

# Supabase (PostgreSQL & Realtime para la Bandeja de WhatsApp)
NEXT_PUBLIC_SUPABASE_URL=https://dywhdvvmtpivkzspihvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
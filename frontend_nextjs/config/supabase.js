import { createClient } from '@supabase/supabase-js';

// URL exacta de tu proyecto activo en Supabase
const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dywhdvvmtpivkzspihvy.supabase.co';

// Clave pública anónima (anon public)
const SUPABASE_ANON_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5d2hkdnZtdHBpdmt6c3BpaHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDI1MTMsImV4cCI6MjA5NjA3ODUxM30.CCmwOMbr7TuoW-dCEHuN9oJvDvYlGqrG5H4J1l7OSmM';

// Cliente optimizado para Realtime puro (sin sobrecarga de sesión local)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
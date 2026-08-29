import { createClient } from '@supabase/supabase-js';

// URL exacta de tu proyecto activo
const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dywhdvvmtpivkzspihvy.supabase.co';

// Pega aquí la clave 'anon public' copiada del botón 'Copy' de tu pantalla anterior
const SUPABASE_ANON_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5d2hkdnZtdHBpdmt6c3BpaHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDI1MTMsImV4cCI6MjA5NjA3ODUxM30.CCmwOMbr7TuoW-dCEHuN9oJvDvYlGqrG5H4J1l7OSmM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const BOT_API_URL = 
  process.env.NEXT_PUBLIC_BOT_API_URL || 'https://bot-dental-wa-227338956023.us-central1.run.app';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Buscamos las variables de entorno configuradas previamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Nos aseguramos que la aplicación no intente arrancar si faltan las credenciales (evita pantalla en negro por errores silenciosos)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan las variables de entorno de Supabase. Revisa el archivo .env o las variables en Vercel.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// ==========================================
// MÉTODOS DE AUTENTICACIÓN (Remplazan a Firebase)
// ==========================================

export const loginWithMagicLink = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
};

export const loginWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.warn("No se encontró perfil para el usuario:", userId);
    return null;
  }
  // Convertimos snake_case a camelCase para que React lo entienda
  return {
    id: data.id,
    role: data.role,
    companyId: data.company_id
  };
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error cerrando sesión en Supabase:", error.message);
    throw error;
  }
};

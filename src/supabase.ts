import { createClient } from '@supabase/supabase-js';

// Buscamos las variables de entorno configuradas previamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Nos aseguramos que la aplicación no intente arrancar si faltan las credenciales (evita pantalla en negro por errores silenciosos)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan las variables de entorno de Supabase. Revisa el archivo .env o las variables en Vercel.");
  throw new Error('Configuración de Supabase incompleta.');
}

// Inicializamos el "motor" principal
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// MÉTODOS DE AUTENTICACIÓN (Remplazan a Firebase)
// ==========================================

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  
  if (error) {
    console.error("Error iniciando sesión con Google en Supabase:", error.message);
    throw error;
  }
  
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error cerrando sesión en Supabase:", error.message);
    throw error;
  }
};

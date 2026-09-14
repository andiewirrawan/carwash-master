import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
}

const supabaseUrl = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

// We ensure supabase is never null by providing placeholder values if not configured.
// This prevents "Cannot read properties of null (reading 'from')" errors.
const effectiveUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: async (url, options) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is tidak terkonfigurasi. Silakan periksa pengaturan Environment Variables (NEXT_PUBLIC_SUPABASE_URL & ANON_KEY).');
      }
      try {
        const response = await fetch(url, options);
        return response;
      } catch (err: any) {
        // Intercept standard fetch errors (e.g., TypeError: Failed to fetch)
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          throw new Error('Koneksi ke database Supabase gagal (Failed to fetch). Pastikan URL valid dan database aktif.');
        }
        throw err;
      }
    },
  },
});

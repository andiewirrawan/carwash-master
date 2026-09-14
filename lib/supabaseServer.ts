import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
}

export function getSupabaseAdminConfig() {
  const supabaseUrl = sanitizeEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );

  let detectedKeyName: string | null = null;
  let serviceRoleKey = '';

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    detectedKeyName = 'SUPABASE_SERVICE_ROLE_KEY';
    serviceRoleKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (process.env.SUPABASE_SERVICE_KEY) {
    detectedKeyName = 'SUPABASE_SERVICE_KEY';
    serviceRoleKey = sanitizeEnv(process.env.SUPABASE_SERVICE_KEY);
  } else if (process.env.SUPABASE_SECRET_KEY) {
    detectedKeyName = 'SUPABASE_SECRET_KEY';
    serviceRoleKey = sanitizeEnv(process.env.SUPABASE_SECRET_KEY);
  }

  const detectedUrlName = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? 'NEXT_PUBLIC_SUPABASE_URL'
    : process.env.SUPABASE_URL
    ? 'SUPABASE_URL'
    : null;

  return {
    hasUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    detectedKeyName,
    detectedUrlName,
    supabaseUrl,
    serviceRoleKey,
  };
}

export function getSupabaseAdmin() {
  const config = getSupabaseAdminConfig();

  if (!config.hasUrl || !config.hasServiceRoleKey) {
    return null;
  }

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, options);
          return response;
        } catch (err: any) {
          if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            throw new Error('Koneksi ke database Supabase gagal dari sisi server (Failed to fetch). Pastikan SUPABASE_URL valid dan aktif.');
          }
          throw err;
        }
      },
    },
  });
}


import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseAdminConfig } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const config = getSupabaseAdminConfig();

    // Safe server-side diagnostic logging (NEVER logs secrets or values)
    console.log('[API /api/login] Execution triggered:', {
      timestamp: new Date().toISOString(),
      hasUrl: config.hasUrl,
      hasServiceRoleKey: config.hasServiceRoleKey,
      detectedKeyName: config.detectedKeyName || 'NONE',
      detectedUrlName: config.detectedUrlName || 'NONE',
      isVercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV,
    });

    if (!config.hasUrl) {
      console.error('[API /api/login] Supabase URL is missing on server-side');
      return NextResponse.json(
        {
          success: false,
          error: 'Konfigurasi server database belum lengkap: NEXT_PUBLIC_SUPABASE_URL belum terpasang di Environment Variables Vercel.',
        },
        { status: 500 }
      );
    }

    if (!config.hasServiceRoleKey) {
      console.error('[API /api/login] SUPABASE_SERVICE_ROLE_KEY is missing on server-side');
      return NextResponse.json(
        {
          success: false,
          error: 'Konfigurasi server database belum lengkap. Environment variable SUPABASE_SERVICE_ROLE_KEY perlu diisi di server-side (Vercel Project Settings > Environment Variables).',
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal menginisialisasi koneksi server database Supabase.',
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body tidak valid (harus JSON).' },
        { status: 400 }
      );
    }

    const { username, password } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username wajib diisi.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();

    // Query users table securely using service_role on server
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, username, password_hash, nama, role, aktif')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (dbError) {
      console.error('[API /api/login] Database query error:', dbError.message);
      return NextResponse.json(
        {
          success: false,
          error: `Database query error: ${dbError.message}`,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username tidak ditemukan.' },
        { status: 401 }
      );
    }

    if (!user.aktif) {
      return NextResponse.json(
        { success: false, error: 'Akun ini telah dinonaktifkan oleh administrator.' },
        { status: 403 }
      );
    }

    // Verify password match against password_hash from Supabase
    if (user.password_hash !== password) {
      return NextResponse.json(
        { success: false, error: 'Password salah. Silakan coba lagi.' },
        { status: 401 }
      );
    }

    // Return safe session user (excluding password_hash)
    const sessionUser = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
    };

    return NextResponse.json({
      success: true,
      user: sessionUser,
    });
  } catch (err: any) {
    console.error('[API /api/login] Uncaught exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan server saat verifikasi login: ' + (err?.message || String(err)),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing on server');
      return NextResponse.json(
        {
          success: false,
          error: 'Konfigurasi server database belum lengkap. Environment variable SUPABASE_SERVICE_ROLE_KEY perlu diisi di server-side.',
        },
        { status: 500 }
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
      console.error('Server login query error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: `Database query error: ${dbError.message}`,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
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
    console.error('API /api/login error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan server saat verifikasi login: ' + (err?.message || String(err)),
      },
      { status: 500 }
    );
  }
}

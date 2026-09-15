import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseAdminConfig } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';
import { Role } from '@/types/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_ROLES: Role[] = ['admin', 'spv', 'owner', 'sistem_owner'];

// Helper to get active Supabase client (service_role or fallback)
function getDb() {
  return getSupabaseAdmin() || clientSupabase;
}

// Helper to verify that the requesting user is an active 'sistem_owner'
async function verifySistemOwner(requestingUserId: number | null | undefined): Promise<{
  authorized: boolean;
  error?: string;
  user?: any;
}> {
  if (!requestingUserId || isNaN(Number(requestingUserId))) {
    return {
      authorized: false,
      error: 'Akses ditolak: Identitas user peminta (requesting_user_id) tidak valid atau belum disertakan.',
    };
  }

  const db = getDb();
  if (!db) {
    return {
      authorized: false,
      error: 'Koneksi database server tidak tersedia.',
    };
  }

  const { data: user, error } = await db
    .from('users')
    .select('id, username, nama, role, aktif')
    .eq('id', Number(requestingUserId))
    .maybeSingle();

  if (error || !user) {
    return {
      authorized: false,
      error: 'User peminta tidak ditemukan dalam database.',
    };
  }

  if (!user.aktif) {
    return {
      authorized: false,
      error: 'Akun user peminta telah dinonaktifkan.',
    };
  }

  if (user.role !== 'sistem_owner') {
    return {
      authorized: false,
      error: `Akses ditolak: Role '${user.role}' tidak diizinkan mengelola user. Fitur ini khusus Sistem Owner.`,
    };
  }

  return { authorized: true, user };
}

// GET: List users
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung' }, { status: 500 });
    }

    const { data, error } = await db
      .from('users')
      .select('id, username, password_hash, nama, role, aktif, created_at')
      .order('id', { ascending: true });

    if (error) {
      console.error('[API /api/users GET error]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add new user (Khusus Sistem Owner)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body tidak valid (harus JSON).' },
        { status: 400 }
      );
    }

    const { requesting_user_id, username, password_hash, password, nama, role, aktif = true } = body;

    // 1. Verifikasi hak akses Sistem Owner
    const authCheck = await verifySistemOwner(requesting_user_id);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: 403 }
      );
    }

    // 2. Validasi input
    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username wajib diisi.' },
        { status: 400 }
      );
    }

    const finalPassword = (password_hash || password || '').trim();
    if (!finalPassword) {
      return NextResponse.json(
        { success: false, error: 'Password wajib diisi untuk user baru.' },
        { status: 400 }
      );
    }

    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Role '${role}' tidak valid. Pilihan role: ${VALID_ROLES.join(', ')}.` },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = getDb();

    // 3. Cek apakah username sudah dipakai
    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Username '${cleanUsername}' sudah digunakan. Silakan gunakan username lain.` },
        { status: 400 }
      );
    }

    // 4. Insert user baru
    const insertPayload = {
      username: cleanUsername,
      password_hash: finalPassword,
      nama: nama.trim(),
      role,
      aktif: Boolean(aktif),
    };

    const { data: newUser, error: insertError } = await db
      .from('users')
      .insert([insertPayload])
      .select('id, username, nama, role, aktif, created_at')
      .single();

    if (insertError) {
      console.error('[API /api/users POST Insert Error]:', insertError);
      return NextResponse.json(
        { success: false, error: `Gagal menyimpan data user ke database: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User '${newUser.username}' (${newUser.role}) berhasil ditambahkan.`,
      data: newUser,
    });
  } catch (err: any) {
    console.error('[API /api/users POST Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem saat menambah user.' },
      { status: 500 }
    );
  }
}

// PUT: Update user / Toggle Aktif / Reset Password (Khusus Sistem Owner)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body tidak valid (harus JSON).' },
        { status: 400 }
      );
    }

    const { requesting_user_id, id, username, nama, role, aktif, password_hash, password } = body;

    // 1. Verifikasi hak akses Sistem Owner
    const authCheck = await verifySistemOwner(requesting_user_id);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: 403 }
      );
    }

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: 'ID user yang akan diubah wajib disertakan.' },
        { status: 400 }
      );
    }

    const targetUserId = Number(id);
    const db = getDb();

    // 2. Cek target user
    const { data: targetUser, error: findError } = await db
      .from('users')
      .select('id, username, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (findError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'User yang akan diedit tidak ditemukan.' },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (username !== undefined && username.trim()) {
      const cleanUsername = username.trim().toLowerCase();
      // Cek apakah username dipakai user lain
      const { data: duplicate } = await db
        .from('users')
        .select('id')
        .ilike('username', cleanUsername)
        .neq('id', targetUserId)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Username '${cleanUsername}' sudah dipakai oleh user lain.` },
          { status: 400 }
        );
      }
      updatePayload.username = cleanUsername;
    }

    if (nama !== undefined && nama.trim()) {
      updatePayload.nama = nama.trim();
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { success: false, error: `Role '${role}' tidak valid.` },
          { status: 400 }
        );
      }
      updatePayload.role = role;
    }

    if (aktif !== undefined) {
      updatePayload.aktif = Boolean(aktif);
    }

    const newPass = (password_hash || password || '').trim();
    if (newPass) {
      updatePayload.password_hash = newPass;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada perubahan data yang dikirim.' },
        { status: 400 }
      );
    }

    const { data: updatedUser, error: updateError } = await db
      .from('users')
      .update(updatePayload)
      .eq('id', targetUserId)
      .select('id, username, nama, role, aktif, created_at')
      .single();

    if (updateError) {
      console.error('[API /api/users PUT Error]:', updateError);
      return NextResponse.json(
        { success: false, error: `Gagal memperbarui user: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data user berhasil diperbarui.',
      data: updatedUser,
    });
  } catch (err: any) {
    console.error('[API /api/users PUT Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan server saat memperbarui user.' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus user (Khusus Sistem Owner)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const reqUserParam = searchParams.get('requesting_user_id');

    const targetUserId = idParam ? parseInt(idParam, 10) : null;
    const requestingUserId = reqUserParam ? parseInt(reqUserParam, 10) : null;

    // 1. Verifikasi hak akses Sistem Owner
    const authCheck = await verifySistemOwner(requestingUserId);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: 403 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Parameter id user wajib disertakan.' },
        { status: 400 }
      );
    }

    if (targetUserId === requestingUserId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const { error: deleteError } = await db.from('users').delete().eq('id', targetUserId);

    if (deleteError) {
      console.error('[API /api/users DELETE Error]:', deleteError);
      return NextResponse.json(
        { success: false, error: `Gagal menghapus user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User berhasil dihapus.',
    });
  } catch (err: any) {
    console.error('[API /api/users DELETE Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem saat menghapus user.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseAdminConfig } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_CLOSING_ROLES = ['admin', 'spv', 'owner', 'sistem_owner'];
const ALLOWED_REOPEN_ROLES = ['spv', 'owner', 'sistem_owner'];

// GET: List or fetch closing info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tanggal = searchParams.get('tanggal');
    const kasirId = searchParams.get('kasir_id');

    const admin = getSupabaseAdmin() || clientSupabase;
    let query = admin.from('daily_closing').select('*, users:kasir_id(nama, username)').order('ditutup_pada', { ascending: false });

    if (tanggal) {
      query = query.eq('tanggal', tanggal);
    }
    if (kasirId) {
      query = query.eq('kasir_id', parseInt(kasirId, 10));
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}

// POST: Create Daily Closing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body tidak valid (harus JSON).' },
        { status: 400 }
      );
    }

    const {
      tanggal,
      kasir_id,
      total_transaksi,
      total_omzet,
      total_tunai = 0,
      total_qris = 0,
      total_piutang = 0,
      total_promo = 0,
      closed_by,
      user_id,
      user_role,
    } = body;

    // 1. Basic validation
    if (!tanggal || !kasir_id) {
      return NextResponse.json(
        { success: false, error: 'Parameter tanggal dan kasir_id wajib diisi.' },
        { status: 400 }
      );
    }

    const dbClient = getSupabaseAdmin() || clientSupabase;
    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client tidak tersedia.' },
        { status: 500 }
      );
    }

    // 2. Validate User & Role from database
    const checkingUserId = user_id || closed_by || kasir_id;
    const { data: userRecord, error: userErr } = await dbClient
      .from('users')
      .select('id, nama, role, aktif')
      .eq('id', checkingUserId)
      .maybeSingle();

    if (userErr || !userRecord) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan dalam database.' },
        { status: 403 }
      );
    }

    if (!userRecord.aktif) {
      return NextResponse.json(
        { success: false, error: 'Akun user sudah tidak aktif.' },
        { status: 403 }
      );
    }

    if (!ALLOWED_CLOSING_ROLES.includes(userRecord.role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Role '${userRecord.role}' tidak memiliki hak untuk melakukan Tutup Hari.`,
        },
        { status: 403 }
      );
    }

    // 3. Check if already closed for this date and cashier (Uniqueness Check)
    const { data: existingClosing, error: checkErr } = await dbClient
      .from('daily_closing')
      .select('id, tanggal, kasir_id, ditutup_pada')
      .eq('tanggal', tanggal)
      .eq('kasir_id', kasir_id)
      .maybeSingle();

    if (existingClosing) {
      return NextResponse.json(
        {
          success: false,
          error: `Shift kasir untuk tanggal ${tanggal} sudah ditutup sebelumnya (ID Closing: ${existingClosing.id}).`,
          existing: existingClosing,
        },
        { status: 409 }
      );
    }

    // 4. Insert closing record
    const insertPayload = {
      tanggal,
      kasir_id,
      total_transaksi: Number(total_transaksi) || 0,
      total_omzet: Number(total_omzet) || 0,
      total_tunai: Number(total_tunai) || 0,
      total_qris: Number(total_qris) || 0,
      total_piutang: Number(total_piutang) || 0,
      total_promo: Number(total_promo) || 0,
      jumlah_transaksi: Number(total_transaksi) || 0,
      closed_by: userRecord.id,
      ditutup_pada: new Date().toISOString(),
    };

    const { data: createdClosing, error: insertErr } = await dbClient
      .from('daily_closing')
      .insert([insertPayload])
      .select('*, users:kasir_id(nama)')
      .single();

    if (insertErr) {
      console.error('[API /api/daily-closing] Insert error:', insertErr);
      return NextResponse.json(
        { success: false, error: `Gagal menyimpan tutup hari: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tutup hari berhasil dicatat.',
      data: {
        id: createdClosing.id,
        tanggal: createdClosing.tanggal,
        kasir_id: createdClosing.kasir_id,
        total_transaksi: Number(createdClosing.total_transaksi || 0),
        total_omzet: Number(createdClosing.total_omzet || 0),
        total_tunai: Number(createdClosing.total_tunai || 0),
        total_qris: Number(createdClosing.total_qris || 0),
        total_piutang: Number(createdClosing.total_piutang || 0),
        total_promo: Number(createdClosing.total_promo || 0),
        ditutup_pada: createdClosing.ditutup_pada,
        kasir_nama: (createdClosing as any).users?.nama || userRecord.nama || 'Kasir',
      },
    });
  } catch (err: any) {
    console.error('[API /api/daily-closing] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem saat tutup hari.' },
      { status: 500 }
    );
  }
}

// DELETE: Reopen Shift (SPV / Owner / Sistem Owner only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('user_id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Parameter id closing wajib diisi.' },
        { status: 400 }
      );
    }

    const dbClient = getSupabaseAdmin() || clientSupabase;
    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client tidak tersedia.' },
        { status: 500 }
      );
    }

    // Role check for reopening
    if (userId) {
      const { data: userRecord } = await dbClient
        .from('users')
        .select('id, role, aktif')
        .eq('id', parseInt(userId, 10))
        .maybeSingle();

      if (!userRecord || !userRecord.aktif || !ALLOWED_REOPEN_ROLES.includes(userRecord.role)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Hanya SPV, Owner, atau Sistem Owner yang berhak membuka kembali shift kasir.',
          },
          { status: 403 }
        );
      }
    }

    const { error: deleteErr } = await dbClient
      .from('daily_closing')
      .delete()
      .eq('id', parseInt(id, 10));

    if (deleteErr) {
      return NextResponse.json(
        { success: false, error: `Gagal membuka kembali shift: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shift kasir berhasil dibuka kembali.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan saat membuka shift.' },
      { status: 500 }
    );
  }
}

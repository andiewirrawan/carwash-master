import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';
import { TransactionStaff } from '@/types/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getDb() {
  return getSupabaseAdmin() || clientSupabase;
}

// GET /api/transaction-staff?transaction_id=123
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transaction_id');

    let query = db
      .from('transaction_staff')
      .select('transaction_id, staff_id, peran, komisi, staff:staff_id(id, nama, role)')
      .order('id', { ascending: true });

    if (transactionId) {
      query = query.eq('transaction_id', Number(transactionId));
    }

    const { data, error } = await query;
    if (error) {
      console.error('API GET transaction_staff error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((s: any) => ({
      transaction_id: s.transaction_id,
      staff_id: s.staff_id,
      peran: s.peran,
      komisi: Number(s.komisi) || 0,
      staff_nama: s.staff?.nama || `Staff #${s.staff_id}`,
      role: s.staff?.role || s.peran,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/transaction-staff (Assign / Update Washer & Checker)
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung.' }, { status: 500 });
    }

    const body = await req.json();
    const { transaction_id, assignments, peran } = body;

    if (!transaction_id) {
      return NextResponse.json({ success: false, error: 'transaction_id wajib diisi.' }, { status: 400 });
    }

    const trxId = Number(transaction_id);

    // 1. Ambil data transaksi saat ini (untuk tanggal dan price_list_id)
    const { data: trx, error: trxErr } = await db
      .from('transactions')
      .select('id, tanggal, price_list_id, harga')
      .eq('id', trxId)
      .single();

    if (trxErr || !trx) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    // 2. Jika assignments diberikan langsung (array of { staff_id, peran, komisi })
    if (Array.isArray(assignments)) {
      // Hapus penugasan peran tertentu atau semua penugasan untuk trx ini
      if (peran) {
        await db.from('transaction_staff').delete().eq('transaction_id', trxId).eq('peran', peran);
      } else {
        await db.from('transaction_staff').delete().eq('transaction_id', trxId);
      }

      if (assignments.length > 0) {
        const payload = assignments.map((a: any) => ({
          transaction_id: trxId,
          staff_id: Number(a.staff_id),
          peran: (a.peran || 'washer').toLowerCase().trim(),
          komisi: Math.round(Number(a.komisi) || 0),
        }));

        const { error: insErr } = await db.from('transaction_staff').insert(payload);
        if (insErr) {
          console.error('API POST transaction_staff insert error:', insErr);
          return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
        }
      }

      // Hitung ulang total komisi washer & checker di transactions
      const { data: allStaff } = await db
        .from('transaction_staff')
        .select('peran, komisi')
        .eq('transaction_id', trxId);

      const totalWasher = (allStaff || [])
        .filter((s: any) => s.peran === 'washer')
        .reduce((sum: number, cur: any) => sum + Number(cur.komisi || 0), 0);

      const totalChecker = (allStaff || [])
        .filter((s: any) => s.peran === 'checker')
        .reduce((sum: number, cur: any) => sum + Number(cur.komisi || 0), 0);

      await db
        .from('transactions')
        .update({
          komisi_washer: totalWasher,
          komisi_checker: totalChecker,
        })
        .eq('id', trxId);

      // Return daftar staff terbaru
      const { data: updatedStaff } = await db
        .from('transaction_staff')
        .select('transaction_id, staff_id, peran, komisi, staff:staff_id(id, nama, role)')
        .eq('transaction_id', trxId);

      const result = (updatedStaff || []).map((s: any) => ({
        transaction_id: s.transaction_id,
        staff_id: s.staff_id,
        peran: s.peran,
        komisi: Number(s.komisi) || 0,
        staff_nama: s.staff?.nama || `Staff #${s.staff_id}`,
        role: s.staff?.role || s.peran,
      }));

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'Format assignments tidak valid.' }, { status: 400 });
  } catch (err: any) {
    console.error('API POST transaction_staff error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';
import { Transaction } from '@/types/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getDb() {
  return getSupabaseAdmin() || clientSupabase;
}

// GET /api/transactions
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const status_pengerjaan = searchParams.get('status_pengerjaan');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const kasirId = searchParams.get('kasirId');
    const id = searchParams.get('id');

    let query = db
      .from('transactions')
      .select(`
        *,
        customers (id, nopol, nama, hp, tier, kendaraan),
        price_list (id, kendaraan, paket, fasilitas, tipe, harga),
        users:kasir_id (id, nama, username),
        transaction_staff (
          transaction_id,
          staff_id,
          peran,
          komisi,
          staff:staff_id (id, nama, role)
        ),
        transaction_void_log (
          id,
          alasan,
          di_void_oleh,
          tanggal_void,
          users:di_void_oleh (id, nama)
        )
      `)
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false });

    if (id) {
      query = query.eq('id', Number(id));
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (status_pengerjaan && status_pengerjaan !== 'all') {
      query = query.eq('status_pengerjaan', status_pengerjaan);
    }
    if (startDate) {
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal', endDate);
    }
    if (kasirId) {
      query = query.eq('kasir_id', Number(kasirId));
    }

    const { data, error } = await query;
    if (error) {
      console.error('API GET /api/transactions error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (data as any[]).map((t) => {
      const cust = t.customers;
      const price = t.price_list;
      const staffRows = t.transaction_staff || [];
      const voidLogs = t.transaction_void_log || [];
      const latestVoid = voidLogs.length > 0 ? voidLogs[voidLogs.length - 1] : null;

      const washers = staffRows.filter((s: any) => s.peran === 'washer');
      const checkers = staffRows.filter((s: any) => s.peran === 'checker');

      return {
        ...t,
        no_polisi: cust?.nopol || t.no_polisi || '-',
        customer_nama: cust?.nama || t.customer_nama || '-',
        customer_hp: cust?.hp || t.customer_hp || '-',
        customer_tier: cust?.tier || 'reguler',
        kendaraan: price?.kendaraan || t.kendaraan || '-',
        paket_nama: price?.paket || t.paket_nama || '-',
        fasilitas: price?.fasilitas || t.fasilitas || '-',
        tipe: price?.tipe || t.tipe || '-',
        kasir_nama: t.users?.nama || t.kasir_nama || 'Kasir',
        komisi_washer: washers.reduce((acc: number, cur: any) => acc + Number(cur.komisi || 0), 0),
        komisi_checker: checkers.reduce((acc: number, cur: any) => acc + Number(cur.komisi || 0), 0),
        staff_assigned: staffRows.map((s: any) => ({
          ...s,
          staff_nama: s.staff?.nama || `Staff #${s.staff_id}`,
          role: s.staff?.role || s.peran,
        })),
        void_log: latestVoid
          ? {
              id: latestVoid.id,
              transaction_id: t.id,
              alasan: latestVoid.alasan,
              di_void_oleh: latestVoid.di_void_oleh,
              di_void_oleh_nama: latestVoid.users?.nama || 'Owner',
              tanggal_void: latestVoid.tanggal_void,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('API GET /api/transactions fatal:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/transactions/pay (Complete Payment)
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung.' }, { status: 500 });
    }

    const body = await req.json();
    const { transactionId, metode_bayar, keterangan } = body;

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId wajib diisi.' }, { status: 400 });
    }

    const waktu_selesai = new Date().toISOString();

    // 1. Ambil transaksi saat ini
    const { data: currentTrx, error: fetchErr } = await db
      .from('transactions')
      .select('*, customers(id)')
      .eq('id', transactionId)
      .single();

    if (fetchErr || !currentTrx) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    // 2. Cek & pastikan komisi washer & checker sudah sinkron dengan transaction_staff
    const { data: existingStaff } = await db
      .from('transaction_staff')
      .select('staff_id, peran, komisi')
      .eq('transaction_id', transactionId);

    // Jika belum ada transaction_staff tapi transaksi memiliki price_list_id, coba cek apakah ada default atau biarkan
    let totalWasher = 0;
    let totalChecker = 0;
    if (existingStaff && existingStaff.length > 0) {
      totalWasher = existingStaff
        .filter((s: any) => s.peran === 'washer')
        .reduce((sum: number, cur: any) => sum + Number(cur.komisi || 0), 0);
      totalChecker = existingStaff
        .filter((s: any) => s.peran === 'checker')
        .reduce((sum: number, cur: any) => sum + Number(cur.komisi || 0), 0);
    }

    let finalKeterangan = currentTrx.keterangan || '';
    if (keterangan && keterangan.trim()) {
      finalKeterangan = finalKeterangan
        ? `${finalKeterangan} | ${keterangan.trim()}`
        : keterangan.trim();
    }

    const updates: any = {
      metode_bayar: metode_bayar || 'Tunai',
      status_pengerjaan: 'selesai',
      waktu_selesai,
      keterangan: finalKeterangan || null,
      komisi_washer: totalWasher,
      komisi_checker: totalChecker,
    };

    if (metode_bayar === 'Piutang') {
      updates.status_piutang = 'belum_lunas';
    }

    const { data: updated, error: updErr } = await db
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ success: false, error: `Gagal memproses pembayaran: ${updErr.message}` }, { status: 500 });
    }

    // 3. Update kunjungan customer
    if (currentTrx.customer_id) {
      const { count } = await db
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', currentTrx.customer_id)
        .eq('status', 'aktif')
        .eq('status_pengerjaan', 'selesai');

      const totalKunjungan = count || 1;
      const tier = totalKunjungan >= 50 ? 'gold' : 'reguler';

      await db
        .from('customers')
        .update({
          total_kunjungan: totalKunjungan,
          tier,
        })
        .eq('id', currentTrx.customer_id);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('API POST /api/transactions error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

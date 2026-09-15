import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';
import { KomisiPerStaff } from '@/types/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getDb() {
  return getSupabaseAdmin() || clientSupabase;
}

// GET /api/reports/komisi-staff?startDate=2026-09-15&endDate=2026-09-15&staffId=14&role=washer
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const staffIdParam = searchParams.get('staffId');
    const roleParam = searchParams.get('role');

    // 1. Ambil seluruh staff aktif
    const { data: staffList, error: staffErr } = await db
      .from('staff')
      .select('id, nama, role, aktif')
      .order('id', { ascending: true });

    if (staffErr) {
      console.error('API komisi-staff: error fetching staff:', staffErr);
      return NextResponse.json({ success: false, error: staffErr.message }, { status: 500 });
    }

    // 2. Ambil seluruh transaksi non-void dalam range tanggal
    let trxQuery = db
      .from('transactions')
      .select(`
        id,
        no_transaksi,
        tanggal,
        status,
        status_pengerjaan,
        price_list_id,
        transaction_staff (
          id,
          staff_id,
          peran,
          komisi
        )
      `)
      .eq('status', 'aktif');

    if (startDate) {
      trxQuery = trxQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      trxQuery = trxQuery.lte('tanggal', endDate);
    }

    const { data: transactions, error: trxErr } = await trxQuery;
    if (trxErr) {
      console.error('API komisi-staff: error fetching transactions:', trxErr);
      return NextResponse.json({ success: false, error: trxErr.message }, { status: 500 });
    }

    // 3. Ambil komisi manual jika ada dalam range tanggal
    let manualQuery = db
      .from('komisi_manual')
      .select('id, staff_id, tanggal, keterangan, nominal');

    if (startDate) {
      manualQuery = manualQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      manualQuery = manualQuery.lte('tanggal', endDate);
    }

    const { data: manualList } = await manualQuery;

    // 4. Hitung rekap per staff
    const result: KomisiPerStaff[] = (staffList || []).map((s: any) => {
      let totalUnitCuci = 0;
      let totalKomisiCuci = 0;

      // Iterasi seluruh transaksi aktif
      (transactions || []).forEach((trx: any) => {
        const staffAssignments = trx.transaction_staff || [];
        const isAssigned = staffAssignments.some((a: any) => a.staff_id === s.id);
        
        if (isAssigned) {
          totalUnitCuci += 1;
          const matchingAssignment = staffAssignments.find((a: any) => a.staff_id === s.id);
          if (matchingAssignment) {
            totalKomisiCuci += Number(matchingAssignment.komisi || 0);
          }
        }
      });

      // Tambahkan komisi manual jika ada
      const staffManuals = (manualList || []).filter((m: any) => m.staff_id === s.id);
      const totalManual = staffManuals.reduce((acc: number, cur: any) => acc + Number(cur.nominal || 0), 0);

      return {
        id: s.id,
        staff_id: s.id,
        nama: s.nama,
        staff_nama: s.nama,
        role: s.role,
        tanggal: startDate || endDate || new Date().toISOString().split('T')[0],
        total_transaksi: totalUnitCuci,
        total_komisi: Math.round(totalKomisiCuci + totalManual),
      };
    });

    // 5. Filter berdasarkan parameter jika ada
    let filtered = result;
    if (staffIdParam) {
      filtered = filtered.filter((r) => r.id === Number(staffIdParam) || r.staff_id === Number(staffIdParam));
    }
    if (roleParam) {
      filtered = filtered.filter((r) => r.role?.toLowerCase() === roleParam.toLowerCase());
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error('API /api/reports/komisi-staff error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

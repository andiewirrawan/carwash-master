import { supabase, isSupabaseConfigured } from './supabase';
import {
  VehicleCategory,
  PriceList,
  PriceListKomisi,
  Staff,
  StaffMultiplier,
  StaffKomisiMultiplier,
  Transaction,
  TransactionStaff,
  LaporanHarian,
  LaporanBulanan,
  KomisiPerStaff,
  User,
  Customer,
  NopolHistory,
  KomisiManual,
  TransactionVoidLog,
  Attendance,
  DailyClosing
} from '@/types/database';

if (!supabase) {
  console.warn("Supabase client is not initialized. Check your environment variables.");
}

// -------------------------------------------------------------
// VEHICLE CATEGORIES
// -------------------------------------------------------------
export async function getVehicleCategories(): Promise<VehicleCategory[]> {
  const { data, error } = await supabase.from('vehicle_categories').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getVehicleCategories error:', error);
    return [];
  }
  return data as VehicleCategory[];
}

export async function addVehicleCategory(item: Omit<VehicleCategory, 'id'>): Promise<VehicleCategory> {
  const { data, error } = await supabase.from('vehicle_categories').insert([item]).select().single();
  if (error) throw error;
  return data as VehicleCategory;
}

export async function updateVehicleCategory(id: number, item: Partial<VehicleCategory>): Promise<VehicleCategory | null> {
  const { data, error } = await supabase.from('vehicle_categories').update(item).eq('id', id).select().single();
  if (error) throw error;
  return data as VehicleCategory;
}

export async function deleteVehicleCategory(id: number): Promise<boolean> {
  const { error } = await supabase.from('vehicle_categories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// -------------------------------------------------------------
// PRICE LIST & PRICE LIST KOMISI
// -------------------------------------------------------------
export async function getPriceListKomisi(priceListId?: number): Promise<PriceListKomisi[]> {
  try {
    const res = await fetch('/api/price-list');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const allK = json.data.flatMap((p: PriceList) => p.komisi_list || []);
        if (priceListId) {
          return allK.filter((k: PriceListKomisi) => k.price_list_id === priceListId);
        }
        return allK;
      }
    }
  } catch {
    // fallback to supabase client
  }

  let query = supabase.from('price_list_komisi').select('*').order('id', { ascending: true });
  if (priceListId) {
    query = query.eq('price_list_id', priceListId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('getPriceListKomisi error:', error);
    return [];
  }
  return (data as any[]).map((k) => ({
    ...k,
    komisi: Number(k.komisi) || 0,
  })) as PriceListKomisi[];
}

export async function savePriceListKomisi(
  priceListId: number,
  roles: { peran: string; komisi: number }[]
): Promise<PriceListKomisi[]> {
  await supabase.from('price_list_komisi').delete().eq('price_list_id', priceListId);
  if (roles.length > 0) {
    const payload = roles.map((r) => ({
      price_list_id: priceListId,
      peran: r.peran.trim(),
      komisi: Number(r.komisi) || 0,
    }));
    const { data, error } = await supabase.from('price_list_komisi').insert(payload).select();
    if (error) throw error;
    return data as PriceListKomisi[];
  }
  return [];
}

export async function getPriceList(): Promise<PriceList[]> {
  // 1. Try server-side API (bypasses RLS issues and handles joins cleanly)
  try {
    const res = await fetch('/api/price-list');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data as PriceList[];
      }
    }
  } catch {
    // fallback to client Supabase
  }

  const { data, error } = await supabase.from('price_list').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getPriceList error:', error);
    return [];
  }
  const rawList = (data as any[]).map((p) => ({
    ...p,
    harga: Number(p.harga) || 0,
    paket_nama: p.paket,
  })) as PriceList[];
  
  const allKomisi = await getPriceListKomisi();
  return rawList.map((item) => {
    const matched = allKomisi.filter((k) => k.price_list_id === item.id);
    const washerKomisi = matched.find((k) => k.peran.toLowerCase() === 'washer')?.komisi;
    const checkerKomisi = matched.find((k) => k.peran.toLowerCase() === 'checker')?.komisi;
    return {
      ...item,
      komisi_list: matched,
      komisi_washer: washerKomisi !== undefined ? washerKomisi : Number(item.komisi_washer || 0),
      komisi_checker: checkerKomisi !== undefined ? checkerKomisi : Number(item.komisi_checker || 0),
    };
  });
}

export async function addPriceList(
  item: Omit<PriceList, 'id'>,
  komisiList?: { peran: string; komisi: number }[],
  requestingUserId?: number | null
): Promise<PriceList> {
  // 1. Try server-side API
  try {
    const res = await fetch('/api/price-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...item,
        komisi_list: komisiList,
        requesting_user_id: requestingUserId,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal menambahkan paket price list.');
    }
    return json.data as PriceList;
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to direct Supabase
    const payload = {
      kendaraan: item.kendaraan,
      paket: item.paket || item.paket_nama || '',
      fasilitas: item.fasilitas,
      tipe: item.tipe,
      harga: Number(item.harga) || 0,
    };
    const { data, error } = await supabase.from('price_list').insert([payload]).select().single();
    if (error) throw error;
    const createdItem = { ...data, harga: Number(data.harga) || 0, paket_nama: data.paket } as PriceList;
    if (komisiList && komisiList.length > 0) {
      createdItem.komisi_list = await savePriceListKomisi(createdItem.id, komisiList);
    }
    return createdItem;
  }
}

export async function updatePriceList(
  id: number,
  item: Partial<PriceList>,
  komisiList?: { peran: string; komisi: number }[],
  requestingUserId?: number | null
): Promise<PriceList | null> {
  // 1. Try server-side API
  try {
    const res = await fetch('/api/price-list', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        ...item,
        komisi_list: komisiList,
        requesting_user_id: requestingUserId,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal mengubah paket price list.');
    }
    return json.data as PriceList;
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to direct client
    const payload: Record<string, any> = {};
    if (item.kendaraan !== undefined) payload.kendaraan = item.kendaraan;
    if (item.paket !== undefined) payload.paket = item.paket;
    if (item.fasilitas !== undefined) payload.fasilitas = item.fasilitas;
    if (item.tipe !== undefined) payload.tipe = item.tipe;
    if (item.harga !== undefined) payload.harga = Number(item.harga) || 0;

    const { data, error } = await supabase.from('price_list').update(payload).eq('id', id).select().single();
    if (error) throw error;
    let updatedItem = { ...data, harga: Number(data.harga) || 0, paket_nama: data.paket } as PriceList;
    if (komisiList !== undefined) {
      updatedItem.komisi_list = await savePriceListKomisi(id, komisiList);
    }
    return updatedItem;
  }
}

export async function deletePriceList(
  id: number,
  requestingUserId?: number | null
): Promise<boolean> {
  // 1. Try server-side API
  try {
    const query = requestingUserId ? `?id=${id}&requesting_user_id=${requestingUserId}` : `?id=${id}`;
    const res = await fetch(`/api/price-list${query}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal menghapus paket price list.');
    }
    return true;
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to direct client
    await supabase.from('price_list_komisi').delete().eq('price_list_id', id);
    const { error } = await supabase.from('price_list').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}

// -------------------------------------------------------------
// STAFF
// -------------------------------------------------------------
export async function getStaffList(): Promise<Staff[]> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Returning empty staff list.');
    return [];
  }
  const { data, error } = await supabase.from('staff').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getStaffList error:', error);
    return [];
  }
  return data as Staff[];
}

export async function addStaff(item: Omit<Staff, 'id'>): Promise<Staff> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is tidak terkonfigurasi. Silakan hubungi admin untuk pengaturan Environment Variables.');
  }
  
  const { data, error } = await supabase.from('staff').insert([item]).select().single();
  
  if (error) {
    console.error('addStaff error:', error);
    throw new Error(`Gagal menambah staff: ${error.message}`);
  }
  
  return data as Staff;
}

export async function updateStaff(id: number, item: Partial<Staff>): Promise<Staff | null> {

  const { data, error } = await supabase.from('staff').update(item).eq('id', id).select().single();
  if (error) {
    console.error('updateStaff error:', error);
    throw new Error(`Gagal mengubah staff: ${error.message}`);
  }
  return data as Staff;
}

export async function deleteStaff(id: number): Promise<boolean> {

  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) {
    console.error('deleteStaff error:', error);
    throw new Error(`Gagal menghapus staff: ${error.message}`);
  }
  return true;
}

// -------------------------------------------------------------
// STAFF KOMISI MULTIPLIER
// -------------------------------------------------------------
export async function getStaffMultipliers(staffId?: number): Promise<StaffKomisiMultiplier[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('staff_komisi_multiplier').select('*, staff:staff_id(nama)').order('berlaku_mulai', { ascending: false });
  if (staffId) {
    query = query.eq('staff_id', staffId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('getStaffMultipliers error:', error);
    return [];
  }
  return (data as any[]).map((d) => ({
    ...d,
    tanggal: d.berlaku_mulai,
    dientry_oleh_nama: d.staff?.nama || 'System',
  })) as StaffKomisiMultiplier[];
}

export async function addStaffMultiplier(item: Omit<StaffKomisiMultiplier, 'id'>): Promise<StaffKomisiMultiplier> {

  const { data, error } = await supabase.from('staff_komisi_multiplier').insert([{
    staff_id: item.staff_id,
    multiplier: Number(item.multiplier) || 0,
    berlaku_mulai: item.berlaku_mulai,
    dientry_oleh: item.dientry_oleh
  }]).select().single();
  if (error) {
    console.error('addStaffMultiplier error:', error);
    throw new Error(`Gagal menambah multiplier: ${error.message}`);
  }
  return data as StaffKomisiMultiplier;
}

export async function getEffectiveMultiplierForDate(staffId: number, targetDateStr: string): Promise<number> {
  const multipliers = await getStaffMultipliers(staffId);
  const targetTime = new Date(targetDateStr).getTime();
  const validRows = multipliers.filter(m => new Date(m.berlaku_mulai).getTime() <= targetTime);
  if (validRows.length === 0) return 0;
  validRows.sort((a, b) => new Date(b.berlaku_mulai).getTime() - new Date(a.berlaku_mulai).getTime());
  return Number(validRows[0].multiplier);
}

// -------------------------------------------------------------
// TRANSACTIONS & TRANSACTION_STAFF (TAHAP 2)
// -------------------------------------------------------------

export const NOPOL_REGEX = /^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$/i;

export function validateNopolFormat(nopol: string): { valid: boolean; formatted: string; error?: string } {
  const clean = nopol.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!NOPOL_REGEX.test(clean)) {
    return {
      valid: false,
      formatted: clean,
      error: 'Format nomor polisi tidak valid! Wajib: HURUF + spasi + ANGKA + spasi + HURUF (contoh: K 1234 NN atau B 123 BSA)',
    };
  }
  return { valid: true, formatted: clean };
}

export async function searchCustomerWithIntensity(nopol: string): Promise<{
  found: boolean;
  customer?: Customer;
  intensitas: number;
}> {
  if (!isSupabaseConfigured) return { found: false, intensitas: 0 };
  const clean = nopol.trim().toUpperCase().replace(/\s+/g, ' ');

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('nopol', clean)
    .maybeSingle();

  if (error || !customer) {
    return { found: false, intensitas: 0 };
  }

  // Calculate intensity: total active & completed transactions throughout time
  const { count, error: countErr } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .eq('status', 'aktif')
    .eq('status_pengerjaan', 'selesai');

  const intensitas = countErr ? (customer.total_kunjungan || 0) : (count || 0);

  return {
    found: true,
    customer: {
      ...customer,
      total_kunjungan: intensitas,
    },
    intensitas,
  };
}

export async function getTransactions(filters?: {
  status?: string;
  status_pengerjaan?: string;
  startDate?: string;
  endDate?: string;
  kasirId?: number;
  id?: number;
}): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];
  
  // 1. Coba lewat API backend untuk konsistensi join dan bypass RLS
  try {
    const params = new URLSearchParams();
    if (filters?.id) params.set('id', String(filters.id));
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.status_pengerjaan && filters.status_pengerjaan !== 'all') params.set('status_pengerjaan', filters.status_pengerjaan);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.kasirId) params.set('kasirId', String(filters.kasirId));

    const res = await fetch(`/api/transactions?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data as Transaction[];
      }
    }
  } catch {
    // fallback to Supabase client
  }

  let query = supabase
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

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.status_pengerjaan && filters.status_pengerjaan !== 'all') {
    query = query.eq('status_pengerjaan', filters.status_pengerjaan);
  }
  if (filters?.startDate) {
    query = query.gte('tanggal', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('tanggal', filters.endDate);
  }
  if (filters?.kasirId) {
    query = query.eq('kasir_id', filters.kasirId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getTransactions join error, fallback to simple select:', error);
    const { data: simpleData } = await supabase.from('transactions').select('*').order('id', { ascending: false });
    return (simpleData || []) as Transaction[];
  }

  return (data as any[]).map((t) => {
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
        role: s.peran,
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
  }) as Transaction[];
}

export async function getTransactionStaff(): Promise<TransactionStaff[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('transaction_staff').select('*, staff:staff_id(nama, role)');
  if (error) {
    console.error('getTransactionStaff error:', error);
    return [];
  }
  return (data as any[]).map((d) => ({
    ...d,
    staff_nama: d.staff?.nama,
    role: d.peran,
  })) as TransactionStaff[];
}

// A. Halaman "Mobil Masuk"
export async function createMobilMasuk(params: {
  nopol: string;
  nama: string;
  hp: string;
  kendaraan: string;
  price_list_id: number;
  harga: number; // Snapshot harga saat mobil masuk
  harga_standar: number;
  harga_disesuaikan: boolean;
  keterangan?: string;
  kasir_id: number;
  tanggal?: string;
}): Promise<Transaction> {


  const cleanNopol = params.nopol.trim().toUpperCase().replace(/\s+/g, ' ');

  // 1. Cari atau buat customer
  let customerId: number;
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .ilike('nopol', cleanNopol)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCust, error: custErr } = await supabase
      .from('customers')
      .insert([
        {
          nopol: cleanNopol,
          nama: params.nama.trim(),
          hp: params.hp.trim(),
          kendaraan: params.kendaraan,
          tier: 'reguler',
        },
      ])
      .select()
      .single();
    if (custErr) throw new Error(`Gagal membuat data customer baru: ${custErr.message}`);
    customerId = newCust.id;
  }

  // 2. Generate nomor transaksi
  const trxDate = params.tanggal || new Date().toISOString().split('T')[0];
  const now = new Date();
  const waktu = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const todayCountQuery = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('tanggal', trxDate);
  const countToday = (todayCountQuery.count || 0) + 1;
  const no_transaksi = `TRX-${trxDate.replace(/-/g, '')}-${String(countToday).padStart(3, '0')}`;

  // Keterangan khusus jika harga disesuaikan
  let finalKeterangan = params.keterangan ? params.keterangan.trim() : '';
  if (params.harga_disesuaikan && !finalKeterangan.includes('Harga disesuaikan')) {
    finalKeterangan = finalKeterangan ? `${finalKeterangan} (Harga disesuaikan)` : 'Harga disesuaikan';
  }

  // Ambil data price list untuk snapshot denormalisasi
  let paket_nama = 'Cuci';
  let kendaraan = 'Mobil';
  let tipe = 'Medium';
  if (params.price_list_id) {
    const { data: pl } = await supabase
      .from('price_list')
      .select('paket, kendaraan, tipe')
      .eq('id', params.price_list_id)
      .maybeSingle();
    if (pl) {
      if (pl.paket) paket_nama = pl.paket;
      if (pl.kendaraan) kendaraan = pl.kendaraan;
      if (pl.tipe) tipe = pl.tipe;
    }
  }

  // 3. Simpan transaksi baru: status_pengerjaan='proses', metode_bayar=NULL, tanpa washer
  const trxPayload: any = {
    no_transaksi,
    no_polisi: params.nopol.toUpperCase().trim(),
    kendaraan,
    tipe,
    paket_nama,
    tanggal: trxDate,
    waktu,
    customer_id: customerId,
    price_list_id: params.price_list_id,
    harga: Number(params.harga),
    metode_bayar: null,
    keterangan: finalKeterangan || null,
    kasir_id: params.kasir_id,
    status: 'aktif',
    status_pengerjaan: 'proses',
    waktu_selesai: null,
  };

  let { data: trx, error: trxErr } = await supabase
    .from('transactions')
    .insert([trxPayload])
    .select()
    .single();

  if (trxErr && (trxErr.code === 'PGRST204' || trxErr.message?.includes('schema cache'))) {
    // Fallback if newly added columns (waktu, price_list_id, keterangan) are not yet in Supabase schema cache
    const fallbackPayload: any = {
      no_transaksi,
      no_polisi: params.nopol.toUpperCase().trim(),
      kendaraan,
      tipe,
      paket_nama,
      tanggal: trxDate,
      customer_id: customerId,
      harga: Number(params.harga),
      metode_bayar: null,
      kasir_id: params.kasir_id,
      status: 'aktif',
      status_pengerjaan: 'proses',
      waktu_selesai: null,
    };
    const retryRes = await supabase.from('transactions').insert([fallbackPayload]).select().single();
    if (!retryRes.error) {
      trx = retryRes.data;
      trxErr = null;
    }
  }

  if (trxErr) throw new Error(`Gagal menyimpan transaksi mobil masuk: ${trxErr.message}`);
  return trx as Transaction;
}

// B. Perhitungan Komisi Washer & Checker
export async function calculateStaffCommissionsForTransaction(
  priceListId: number,
  transactionDate: string,
  washerIds: number[],
  checkerIds: number[]
): Promise<Array<{ staff_id: number; peran: string; komisi: number; multiplier?: number; staff_nama?: string }>> {
  if (!isSupabaseConfigured) return [];

  // 1. Ambil dari price_list_komisi via helper getPriceListKomisi
  let komisiRows = await getPriceListKomisi(priceListId);

  // 2. Fallback ke kolom komisi_washer / komisi_checker di price_list jika price_list_komisi belum ada
  if (!komisiRows || komisiRows.length === 0) {
    const { data: pl } = await supabase.from('price_list').select('komisi_washer, komisi_checker').eq('id', priceListId).maybeSingle();
    if (pl) {
      komisiRows = [];
      if (pl.komisi_washer && Number(pl.komisi_washer) > 0) {
        komisiRows.push({ id: 0, price_list_id: priceListId, peran: 'washer', komisi: Number(pl.komisi_washer) });
      }
      if (pl.komisi_checker && Number(pl.komisi_checker) > 0) {
        komisiRows.push({ id: 0, price_list_id: priceListId, peran: 'checker', komisi: Number(pl.komisi_checker) });
      }
    }
  }

  const assignments: Array<{ staff_id: number; peran: string; komisi: number; multiplier?: number; staff_nama?: string }> = [];

  // 1. Washer Pool
  const washerRule = komisiRows.find((r) => r.peran?.toLowerCase() === 'washer');
  const totalWasherKomisi = washerRule ? Number(washerRule.komisi) : 0;

  if (washerIds.length > 0 && totalWasherKomisi > 0) {
    const baseWasher = totalWasherKomisi / washerIds.length;
    for (const wid of washerIds) {
      const mult = await getEffectiveMultiplierForDate(wid, transactionDate);
      const finalKomisi = Math.round(baseWasher * (1 + mult / 100));
      assignments.push({
        staff_id: wid,
        peran: 'washer',
        komisi: finalKomisi,
        multiplier: mult,
      });
    }
  } else if (washerIds.length > 0) {
    for (const wid of washerIds) {
      assignments.push({
        staff_id: wid,
        peran: 'washer',
        komisi: 0,
        multiplier: 0,
      });
    }
  }

  // 2. Checker Pool (Tanpa multiplier)
  const checkerRule = komisiRows.find((r) => r.peran?.toLowerCase() === 'checker');
  const totalCheckerKomisi = checkerRule ? Number(checkerRule.komisi) : 0;

  if (checkerIds.length > 0 && totalCheckerKomisi > 0) {
    const baseChecker = Math.round(totalCheckerKomisi / checkerIds.length);
    for (const cid of checkerIds) {
      assignments.push({
        staff_id: cid,
        peran: 'checker',
        komisi: baseChecker,
        multiplier: 0,
      });
    }
  } else if (checkerIds.length > 0) {
    for (const cid of checkerIds) {
      assignments.push({
        staff_id: cid,
        peran: 'checker',
        komisi: 0,
        multiplier: 0,
      });
    }
  }

  return assignments;
}

// B. Assign / Update Washer & Checker ("Sedang Dikerjakan")
export async function assignTransactionStaff(
  transactionId: number,
  assignments: Array<{ staff_id: number; peran: string; komisi: number }>
): Promise<void> {
  // 1. Coba lewat API backend (service_role) untuk melewati batasan RLS
  try {
    const res = await fetch('/api/transaction-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_id: transactionId,
        assignments,
      }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return;
    }
  } catch {
    // fallback to supabase client
  }

  // 2. Fallback Supabase client
  const { error: delErr } = await supabase
    .from('transaction_staff')
    .delete()
    .eq('transaction_id', transactionId);

  if (delErr) {
    console.error('assignTransactionStaff delete error:', delErr);
  }

  if (assignments.length > 0) {
    const payload = assignments.map((a) => ({
      transaction_id: transactionId,
      staff_id: a.staff_id,
      peran: a.peran,
      komisi: a.komisi,
    }));

    const { error: insErr } = await supabase.from('transaction_staff').insert(payload);
    if (insErr) {
      throw new Error(`Gagal menyimpan penugasan staff: ${insErr.message}`);
    }
  }
}

// C. Pembayaran ("Pembayaran")
export async function completeTransactionPayment(params: {
  transactionId: number;
  metode_bayar: 'Tunai' | 'Non Tunai' | string;
  keterangan?: string;
}): Promise<Transaction> {
  // 1. Coba lewat API backend
  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (res.ok && json.success && json.data) {
      return json.data as Transaction;
    }
  } catch {
    // fallback
  }

  const waktu_selesai = new Date().toISOString();

  // Ambil transaksi saat ini untuk dapat customer_id dan omzet
  const { data: currentTrx, error: fetchErr } = await supabase
    .from('transactions')
    .select('*, customers(id)')
    .eq('id', params.transactionId)
    .single();

  if (fetchErr || !currentTrx) throw new Error('Transaksi tidak ditemukan.');

  let finalKeterangan = currentTrx.keterangan || '';
  if (params.keterangan && params.keterangan.trim()) {
    finalKeterangan = finalKeterangan
      ? `${finalKeterangan} | ${params.keterangan.trim()}`
      : params.keterangan.trim();
  }

  const updates: any = {
    metode_bayar: params.metode_bayar,
    status_pengerjaan: 'selesai',
    waktu_selesai,
    keterangan: finalKeterangan || null,
  };

  if (params.metode_bayar === 'Piutang') {
    updates.status_piutang = 'belum_lunas';
  }

  const { data: updated, error: updErr } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', params.transactionId)
    .select()
    .single();

  if (updErr) throw new Error(`Gagal memproses pembayaran: ${updErr.message}`);

  // Hitung ulang intensitas customer (hanya status='aktif' AND status_pengerjaan='selesai')
  if (currentTrx.customer_id) {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', currentTrx.customer_id)
      .eq('status', 'aktif')
      .eq('status_pengerjaan', 'selesai');

    const totalKunjungan = count || 1;
    const tier = totalKunjungan >= 50 ? 'gold' : 'reguler';

    await supabase
      .from('customers')
      .update({
        total_kunjungan: totalKunjungan,
        tier,
      })
      .eq('id', currentTrx.customer_id);
  }

  return updated as Transaction;
}

// Backwards-compatible addTransaction
export async function addTransaction(
  trx: Omit<Transaction, 'id' | 'no_transaksi' | 'created_at'>,
  staffAssignments: Array<{ staff_id: number; peran?: string; komisi: number }>
): Promise<Transaction> {
  const todayCountQuery = await supabase.from('transactions').select('id', { count: 'exact' }).eq('tanggal', trx.tanggal);
  const countToday = (todayCountQuery.count || 0) + 1;
  const no_transaksi = `TRX-${trx.tanggal.replace(/-/g, '')}-${String(countToday).padStart(3, '0')}`;

  const newTrx = {
    ...trx,
    no_transaksi,
    status_piutang: trx.metode_bayar === 'Piutang' ? (trx.status_piutang || 'belum_lunas') : null,
    waktu_selesai: trx.metode_bayar && trx.metode_bayar !== 'Belum Bayar' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from('transactions').insert([newTrx]).select().single();
  if (error) throw error;

  const savedTrx = data as Transaction;

  if (staffAssignments.length > 0) {
    const staffInserts = staffAssignments.map((s) => ({
      transaction_id: savedTrx.id,
      staff_id: s.staff_id,
      peran: s.peran || 'washer',
      komisi: s.komisi,
    }));
    const { error: staffError } = await supabase.from('transaction_staff').insert(staffInserts);
    if (staffError) throw staffError;
  }

  return savedTrx;
}

// Update Transaction (Dengan pengecekan tutup hari)
export async function updateTransaction(
  id: number,
  updates: Partial<Transaction>,
  staffAssignments?: Array<{ staff_id: number; peran?: string; komisi: number }>
): Promise<void> {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) throw error;

  if (staffAssignments) {
    await supabase.from('transaction_staff').delete().eq('transaction_id', id);
    if (staffAssignments.length > 0) {
      const staffInserts = staffAssignments.map((s) => ({
        transaction_id: id,
        staff_id: s.staff_id,
        peran: s.peran || 'washer',
        komisi: s.komisi,
      }));
      await supabase.from('transaction_staff').insert(staffInserts);
    }
  }
}

// Void Transaksi (Khusus Owner / Sistem Owner)
export async function voidTransaction(id: number, alasan: string, userId: number | null): Promise<void> {

  if (!alasan || !alasan.trim()) {
    throw new Error('Alasan void wajib diisi.');
  }

  const trxRes = await supabase.from('transactions').select('status, customer_id, harga').eq('id', id).single();

  if (trxRes.data && trxRes.data.status === 'aktif') {
    const { error } = await supabase.from('transactions').update({ status: 'void' }).eq('id', id);
    if (error) throw error;

    await supabase.from('transaction_void_log').insert([
      {
        transaction_id: id,
        alasan: alasan.trim(),
        di_void_oleh: userId,
        tanggal_void: new Date().toISOString(),
      },
    ]);

    // Recalculate customer visits
    if (trxRes.data.customer_id) {
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', trxRes.data.customer_id)
        .eq('status', 'aktif')
        .eq('status_pengerjaan', 'selesai');

      const newKunjungan = count || 0;
      const tier = newKunjungan >= 50 ? 'gold' : 'reguler';
      await supabase.from('customers').update({ total_kunjungan: newKunjungan, tier }).eq('id', trxRes.data.customer_id);
    }
  }
}

// Hapus Transaksi (Khusus transaksi antrean / proses yang dibatalkan / salah input)
export async function deleteTransaction(id: number): Promise<void> {
  if (!isSupabaseConfigured) return;

  // Hapus relasi staff dan logs
  await supabase.from('transaction_staff').delete().eq('transaction_id', id);
  await supabase.from('transaction_void_log').delete().eq('transaction_id', id);

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) {
    throw new Error(`Gagal menghapus transaksi: ${error.message}`);
  }
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// CUSTOMERS & NOPOL HISTORY (TAHAP 4)
// -------------------------------------------------------------
export async function getCustomers(search?: string): Promise<Customer[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase.from('customers').select('*').order('id', { ascending: false });
  if (search && search.trim()) {
    const q = search.trim();
    // Search by nopol or nama
    query = query.or(`nopol.ilike.%${q}%,nama.ilike.%${q}%`);
  }

  const { data: rawCustomers, error } = await query;
  if (error || !rawCustomers) {
    console.error('getCustomers error:', error);
    return [];
  }

  // Aggregate active & completed transactions to accurately calculate total_kunjungan & total_omzet
  // Transactions that are voided or still 'proses' (unpaid) are strictly excluded.
  const { data: activeCompletedTrx } = await supabase
    .from('transactions')
    .select('customer_id, harga')
    .eq('status', 'aktif')
    .eq('status_pengerjaan', 'selesai');

  const countMap = new Map<number, number>();
  const omzetMap = new Map<number, number>();

  if (activeCompletedTrx) {
    for (const trx of activeCompletedTrx) {
      if (trx.customer_id) {
        const cId = Number(trx.customer_id);
        countMap.set(cId, (countMap.get(cId) || 0) + 1);
        omzetMap.set(cId, (omzetMap.get(cId) || 0) + (Number(trx.harga) || 0));
      }
    }
  }

  return (rawCustomers as Customer[]).map((c) => {
    const totalKunjungan = countMap.get(c.id) ?? 0;
    const totalOmzet = omzetMap.get(c.id) ?? 0;
    const calculatedTier = totalKunjungan >= 50 ? 'gold' : 'reguler';

    return {
      ...c,
      total_kunjungan: totalKunjungan,
      total_omzet: totalOmzet,
      tier: calculatedTier,
    };
  });
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;

  // Aggregate active & completed transactions for this customer
  const { data: trxs } = await supabase
    .from('transactions')
    .select('harga')
    .eq('customer_id', id)
    .eq('status', 'aktif')
    .eq('status_pengerjaan', 'selesai');

  const totalKunjungan = trxs ? trxs.length : (data.total_kunjungan || 0);
  const totalOmzet = trxs ? trxs.reduce((sum, t) => sum + (Number(t.harga) || 0), 0) : (data.total_omzet || 0);
  const calculatedTier = totalKunjungan >= 50 ? 'gold' : 'reguler';

  return {
    ...data,
    total_kunjungan: totalKunjungan,
    total_omzet: totalOmzet,
    tier: calculatedTier,
  } as Customer;
}

export async function getCustomerByNopol(nopol: string): Promise<Customer | null> {
  if (!isSupabaseConfigured) return null;
  const clean = nopol.trim().toUpperCase().replace(/\s+/g, ' ');
  const { data, error } = await supabase.from('customers').select('*').ilike('nopol', clean).maybeSingle();
  if (error || !data) return null;
  return data as Customer;
}

export async function addCustomer(item: Omit<Customer, 'id'>): Promise<Customer> {

  const payload = {
    ...item,
    tier: 'reguler',
    total_kunjungan: 0,
    total_omzet: 0,
  };
  const { data, error } = await supabase.from('customers').insert([payload]).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: number, updates: Partial<Customer>): Promise<void> {

  const { error } = await supabase.from('customers').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getNopolHistory(customerId?: number): Promise<NopolHistory[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('nopol_history')
    .select('*, users:diubah_oleh(nama, username)')
    .order('tanggal_ubah', { ascending: false });

  if (customerId) query = query.eq('customer_id', customerId);
  const { data, error } = await query;
  if (error) {
    console.error('getNopolHistory error:', error);
    return [];
  }
  return (data as any[]).map((h) => ({
    ...h,
    diubah_oleh_nama: h.users?.nama || (h.diubah_oleh ? `User #${h.diubah_oleh}` : 'Admin/Sistem'),
  })) as NopolHistory[];
}

export async function getOldPlateInfo(nopol: string): Promise<NopolHistory | null> {
  if (!isSupabaseConfigured) return null;
  const clean = nopol.trim().toUpperCase().replace(/\s+/g, ' ');
  const { data, error } = await supabase.from('nopol_history').select('*').ilike('nopol_lama', clean).limit(1).maybeSingle();
  if (error) return null;
  return data as NopolHistory;
}

export async function gantiNopol(
  customerId: number,
  nopolBaru: string,
  diubahOleh: number | null,
  diubahOlehNama?: string
): Promise<{ success: boolean; error?: string }> {


  const validation = validateNopolFormat(nopolBaru);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Format nomor polisi tidak valid!' };
  }

  const cleanNopol = validation.formatted;

  const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
  if (!customer) return { success: false, error: 'Data customer tidak ditemukan.' };

  if (customer.nopol.toUpperCase() === cleanNopol) {
    return { success: false, error: 'Nomor polisi baru sama persis dengan plat nomor saat ini.' };
  }

  // Cek apakah nopol baru sudah dipakai customer lain
  const { data: exist } = await supabase.from('customers').select('id').ilike('nopol', cleanNopol).maybeSingle();
  if (exist) return { success: false, error: `Nomor polisi ${cleanNopol} sudah dipakai oleh customer lain.` };

  // Cek apakah nopol baru adalah plat lama yang sudah berhenti aktif
  const { data: retired } = await supabase.from('nopol_history').select('id').ilike('nopol_lama', cleanNopol).maybeSingle();
  if (retired) return { success: false, error: `Nomor polisi ${cleanNopol} adalah plat lama yang sudah berhenti aktif.` };

  // Snapshot intensitas saat pindah (total kunjungan aktif & selesai sampai saat ini)
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('status', 'aktif')
    .eq('status_pengerjaan', 'selesai');

  const intensitasSaatPindah = count ?? (customer.total_kunjungan || 0);

  // Simpan nopol_lama -> nopol_baru + snapshot intensitas_saat_pindah ke tabel nopol_history
  const newHistoryRecord = {
    customer_id: customerId,
    nopol_lama: customer.nopol,
    nopol_baru: cleanNopol,
    intensitas_saat_pindah: intensitasSaatPindah,
    diubah_oleh: diubahOleh,
    tanggal_ubah: new Date().toISOString(),
  };

  const { error: histError } = await supabase.from('nopol_history').insert([newHistoryRecord]);
  if (histError) return { success: false, error: `Gagal mencatat riwayat plat: ${histError.message}` };

  // Update kolom nopol di tabel customers (intensitas TIDAK di-reset)
  const { error: updError } = await supabase.from('customers').update({ nopol: cleanNopol }).eq('id', customerId);
  if (updError) return { success: false, error: `Gagal memperbarui plat customer: ${updError.message}` };

  return { success: true };
}

export async function getCustomerTransactions(customerId: number): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];
  const customer = await getCustomerById(customerId);
  if (!customer) return [];

  // Ambil riwayat plat untuk customer ini
  const nopolHistory = await getNopolHistory(customerId);
  // Urutkan riwayat dari yang paling lama ke yang terbaru
  const sortedHistory = [...nopolHistory].sort(
    (a, b) => new Date(a.tanggal_ubah).getTime() - new Date(b.tanggal_ubah).getTime()
  );

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      price_list (id, kendaraan, paket, fasilitas, tipe, harga),
      users:kasir_id (id, nama, username)
    `)
    .eq('customer_id', customerId)
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('getCustomerTransactions error:', error);
    return [];
  }

  return (data as any[]).map((t) => {
    const price = t.price_list;
    const trxDateTime = t.created_at || `${t.tanggal}T${t.waktu || '00:00:00'}`;
    const trxTime = new Date(trxDateTime).getTime();

    // Tentukan nopol yang aktif saat transaksi ini terjadi
    let plateUsed = customer.nopol;
    for (const h of sortedHistory) {
      const changeTime = new Date(h.tanggal_ubah).getTime();
      if (trxTime < changeTime) {
        plateUsed = h.nopol_lama;
        break;
      }
    }

    return {
      ...t,
      no_polisi: t.no_polisi || plateUsed,
      kendaraan: price?.kendaraan || t.kendaraan || '-',
      paket_nama: price?.paket || t.paket_nama || '-',
      fasilitas: price?.fasilitas || t.fasilitas || '-',
      tipe: price?.tipe || t.tipe || '-',
      kasir_nama: t.users?.nama || t.kasir_nama || 'Kasir',
    };
  }) as Transaction[];
}

// -------------------------------------------------------------
// PIUTANG MANAGEMENT (TAHAP 4)
// -------------------------------------------------------------
export async function getPiutangTransactions(
  statusFilter: 'belum_lunas' | 'lunas' | 'all' = 'belum_lunas',
  search?: string
): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('transactions')
    .select(`
      *,
      customers (id, nopol, nama, hp),
      price_list (id, kendaraan, paket, fasilitas, tipe)
    `)
    .eq('metode_bayar', 'Piutang')
    .eq('status', 'aktif')
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });

  if (statusFilter === 'belum_lunas') {
    query = query.neq('status_piutang', 'lunas');
  } else if (statusFilter === 'lunas') {
    query = query.eq('status_piutang', 'lunas');
  }

  const { data, error } = await query;
  if (error) {
    console.error('getPiutangTransactions error:', error);
    return [];
  }

  let trxs = (data as any[]).map((t) => ({
    ...t,
    no_polisi: t.customers?.nopol || t.no_polisi || '-',
    customer_nama: t.customers?.nama || t.customer_nama || '-',
    customer_hp: t.customers?.hp || t.customer_hp || '-',
    paket_nama: t.price_list?.paket || t.paket_nama || '-',
    kendaraan: t.price_list?.kendaraan || t.kendaraan || '-',
    tipe: t.price_list?.tipe || t.tipe || '-',
  })) as Transaction[];

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    trxs = trxs.filter(
      (t) =>
        t.no_transaksi?.toLowerCase().includes(q) ||
        t.no_polisi?.toLowerCase().includes(q) ||
        t.customer_nama?.toLowerCase().includes(q) ||
        t.customer_hp?.toLowerCase().includes(q) ||
        t.paket_nama?.toLowerCase().includes(q)
    );
  }

  return trxs;
}

export async function markPiutangLunas(transactionId: number): Promise<boolean> {


  const { error } = await supabase
    .from('transactions')
    .update({
      status_piutang: 'lunas',
      tanggal_lunas: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (error) {
    console.error('markPiutangLunas error:', error);
    throw error;
  }
  return true;
}

// -------------------------------------------------------------
// KOMISI MANUAL
// -------------------------------------------------------------
export async function getKomisiManual(): Promise<KomisiManual[]> {
  const { data, error } = await supabase.from('komisi_manual').select('*, staff:staff_id(nama)').order('tanggal', { ascending: false });
  if (error) {
    console.error('getKomisiManual error:', error);
    return [];
  }
  return (data as any[]).map(d => ({
    ...d,
    staff_nama: d.staff?.nama,
  })) as KomisiManual[];
}

export async function addKomisiManual(item: Omit<KomisiManual, 'id'>): Promise<KomisiManual> {
  const { data, error } = await supabase.from('komisi_manual').insert([item]).select().single();
  if (error) throw error;
  return data as KomisiManual;
}

// -------------------------------------------------------------
// SQL VIEWS INTEGRATION
// -------------------------------------------------------------
export async function getLaporanHarian(): Promise<LaporanHarian[]> {
  const { data, error } = await supabase.from('laporan_harian').select('*').order('tanggal', { ascending: false });
  if (error) {
    console.error('getLaporanHarian error:', error);
    return [];
  }
  return data as LaporanHarian[];
}

export async function getLaporanHarianRange(startDate: string, endDate: string): Promise<LaporanHarian[]> {
  const { data, error } = await supabase.from('laporan_harian').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: false });
  if (error) {
    console.error('getLaporanHarianRange error:', error);
    return [];
  }
  return data as LaporanHarian[];
}

export async function getLaporanBulanan(year?: number): Promise<LaporanBulanan[]> {
  let query = supabase.from('laporan_bulanan').select('*').order('bulan', { ascending: false });
  if (year) {
    query = query.gte('bulan', `${year}-01-01`).lte('bulan', `${year}-12-31`);
  }
  const { data, error } = await query;
  if (error) {
    console.error('getLaporanBulanan error:', error);
    return [];
  }
  return data as LaporanBulanan[];
}

export async function getKomisiPerStaff(filters?: { startDate?: string; endDate?: string; staffId?: number; role?: string; }): Promise<KomisiPerStaff[]> {
  let query = supabase.from('komisi_per_staff').select('*');
  if (filters?.startDate) query = query.gte('tanggal', filters.startDate);
  if (filters?.endDate) query = query.lte('tanggal', filters.endDate);
  if (filters?.staffId) query = query.eq('id', filters.staffId);
  if (filters?.role) query = query.eq('role', filters.role);
  
  const { data, error } = await query;
  if (error) {
    console.error('getKomisiPerStaff error:', error);
    return [];
  }
  return data as KomisiPerStaff[];
}

// -------------------------------------------------------------
// USERS (KELOLA USER - KHUSUS SISTEM OWNER)
// -------------------------------------------------------------
export async function getUsersList(): Promise<User[]> {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data as User[];
      }
    }
  } catch {
    // fallback to supabase client
  }

  const { data, error } = await supabase.from('users').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getUsersList error:', error);
    return [];
  }
  return data as User[];
}

export async function addUser(
  user: Omit<User, 'id' | 'created_at'>,
  requestingUserId?: number | null
): Promise<User> {
  // 1. Try secure server-side API
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...user,
        requesting_user_id: requestingUserId,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal menyimpan data user.');
    }
    return json.data as User;
  } catch (apiErr: any) {
    // If it's a validation / authorization error from the API, rethrow directly
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to Supabase RPC
    if (requestingUserId) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('sp_add_user_sistem_owner', {
        p_requesting_user_id: requestingUserId,
        p_username: user.username,
        p_password_hash: user.password_hash,
        p_nama: user.nama,
        p_role: user.role,
        p_aktif: user.aktif !== undefined ? user.aktif : true,
      });

      if (!rpcError && rpcData) {
        return rpcData as User;
      }
      if (rpcError) {
        throw new Error(rpcError.message);
      }
    }

    // 3. Fallback to direct client insert
    const { data, error } = await supabase.from('users').insert([user]).select().single();
    if (error) throw new Error(error.message || 'Gagal menyimpan data user ke database.');
    return data as User;
  }
}

export async function updateUser(
  id: number,
  item: Partial<User>,
  requestingUserId?: number | null
): Promise<User | null> {
  // 1. Try secure server-side API
  try {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        ...item,
        requesting_user_id: requestingUserId,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal memperbarui data user.');
    }
    return json.data as User;
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to Supabase RPC
    if (requestingUserId) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('sp_update_user_sistem_owner', {
        p_requesting_user_id: requestingUserId,
        p_target_user_id: id,
        p_username: item.username || null,
        p_nama: item.nama || null,
        p_role: item.role || null,
        p_aktif: item.aktif !== undefined ? item.aktif : null,
        p_password_hash: item.password_hash || null,
      });

      if (!rpcError && rpcData) {
        return rpcData as User;
      }
      if (rpcError) {
        throw new Error(rpcError.message);
      }
    }

    // 3. Fallback direct update
    const { data, error } = await supabase.from('users').update(item).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Gagal mengubah data user.');
    return data as User;
  }
}

export async function resetPassword(
  id: number,
  newPasswordHash: string,
  requestingUserId?: number | null
): Promise<boolean> {
  // 1. Try secure server-side API
  try {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        password_hash: newPasswordHash,
        requesting_user_id: requestingUserId,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal mereset password.');
    }
    return true;
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to RPC
    if (requestingUserId) {
      const { error: rpcError } = await supabase.rpc('sp_reset_password_sistem_owner', {
        p_requesting_user_id: requestingUserId,
        p_target_user_id: id,
        p_new_password_hash: newPasswordHash,
      });
      if (rpcError) throw new Error(rpcError.message);
      return true;
    }

    const { error } = await supabase.from('users').update({ password_hash: newPasswordHash }).eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export async function deleteUser(
  id: number,
  requestingUserId?: number | null
): Promise<boolean> {
  // 1. Try secure server-side API
  try {
    const query = requestingUserId ? `?id=${id}&requesting_user_id=${requestingUserId}` : `?id=${id}`;
    const res = await fetch(`/api/users${query}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Gagal menghapus user.');
    }
    return true;
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }

    // 2. Fallback to RPC
    if (requestingUserId) {
      const { error: rpcError } = await supabase.rpc('sp_delete_user_sistem_owner', {
        p_requesting_user_id: requestingUserId,
        p_target_user_id: id,
      });
      if (rpcError) throw new Error(rpcError.message);
      return true;
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const SUPABASE_MIGRATION_SQL = `
-- Supabase Migration SQL has been extracted for deployment
-- No longer needed here as a string for dummy reasons, but exported to satisfy types.
`;

// -------------------------------------------------------------
// ATTENDANCE
// -------------------------------------------------------------
export async function getAttendanceList(startDate?: string, endDate?: string): Promise<Attendance[]> {
  let query = supabase.from('attendance').select('*, staff:staff_id(nama, role)').order('tanggal', { ascending: false });
  if (startDate) query = query.gte('tanggal', startDate);
  if (endDate) query = query.lte('tanggal', endDate);
  
  const { data, error } = await query;
  if (error) {
    console.error('getAttendanceList error:', error);
    return [];
  }
  return (data as any[]).map(d => ({
    ...d,
    staff_nama: d.staff?.nama,
    staff_role: d.staff?.role,
  })) as Attendance[];
}

export async function addAttendance(item: Omit<Attendance, 'id'>): Promise<Attendance> {
  const { data, error } = await supabase.from('attendance').insert([item]).select().single();
  if (error) throw error;
  return data as Attendance;
}

export async function updateAttendance(id: number, updates: Partial<Attendance>): Promise<void> {
  const { error } = await supabase.from('attendance').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteAttendance(id: number): Promise<void> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// DAILY CLOSING (TAHAP 2)
// -------------------------------------------------------------

export async function isDayClosedForCashier(tanggal: string, kasirId: number): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase
    .from('daily_closing')
    .select('id')
    .eq('tanggal', tanggal)
    .eq('kasir_id', kasirId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function getDailyClosing(tanggal: string, kasirId?: number): Promise<DailyClosing | null> {
  if (!isSupabaseConfigured) return null;
  let query = supabase.from('daily_closing').select('*, users:kasir_id(nama)').eq('tanggal', tanggal);
  if (kasirId) {
    query = query.eq('kasir_id', kasirId);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    tanggal: data.tanggal,
    kasir_id: data.kasir_id,
    total_transaksi: Number(data.total_transaksi || data.jumlah_transaksi || 0),
    total_omzet: Number(data.total_omzet || 0),
    total_tunai: Number(data.total_tunai || 0),
    total_qris: Number(data.total_qris || 0),
    total_piutang: Number(data.total_piutang || 0),
    total_promo: Number(data.total_promo || 0),
    ditutup_pada: data.ditutup_pada,
    kasir_nama: (data as any).users?.nama || 'Kasir',
  } as DailyClosing;
}

export async function getDailyClosingList(tanggal?: string): Promise<DailyClosing[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('daily_closing')
    .select('*, users:kasir_id(nama, username)')
    .order('tanggal', { ascending: false })
    .order('ditutup_pada', { ascending: false });

  if (tanggal) {
    query = query.eq('tanggal', tanggal);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getDailyClosingList error:', error);
    return [];
  }

  return (data as any[]).map((d) => ({
    id: d.id,
    tanggal: d.tanggal,
    kasir_id: d.kasir_id,
    total_transaksi: Number(d.total_transaksi || d.jumlah_transaksi || 0),
    total_omzet: Number(d.total_omzet || 0),
    total_tunai: Number(d.total_tunai || 0),
    total_qris: Number(d.total_qris || 0),
    total_piutang: Number(d.total_piutang || 0),
    total_promo: Number(d.total_promo || 0),
    ditutup_pada: d.ditutup_pada,
    kasir_nama: d.users?.nama || `Kasir #${d.kasir_id}`,
  })) as DailyClosing[];
}

export async function createDailyClosing(params: {
  tanggal: string;
  kasir_id: number;
  total_transaksi: number;
  total_omzet: number;
  total_tunai?: number;
  total_qris?: number;
  total_piutang?: number;
  total_promo?: number;
  closed_by?: number;
  user_id?: number;
  user_role?: string;
}): Promise<DailyClosing> {
  // First try via server API route for secure validation and RLS compliance
  try {
    const res = await fetch('/api/daily-closing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await res.json();
    if (res.ok && result.success && result.data) {
      return result.data as DailyClosing;
    } else if (result.error) {
      throw new Error(result.error);
    }
  } catch (apiErr: any) {
    // If error contains specific business message from API, throw it directly
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }
    console.warn('API /api/daily-closing fetch fallback, trying direct client insert:', apiErr);
  }

  // Fallback to direct client-side Supabase insert
  const payload = {
    tanggal: params.tanggal,
    kasir_id: params.kasir_id,
    total_transaksi: params.total_transaksi,
    total_omzet: params.total_omzet,
    total_tunai: params.total_tunai || 0,
    total_qris: params.total_qris || 0,
    total_piutang: params.total_piutang || 0,
    total_promo: params.total_promo || 0,
    jumlah_transaksi: params.total_transaksi,
    closed_by: params.closed_by || params.kasir_id,
    ditutup_pada: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_closing')
    .insert([payload])
    .select('*, users:kasir_id(nama)')
    .single();

  if (error) {
    console.error('createDailyClosing error:', error);
    throw new Error(`Gagal menutup hari: ${error.message}`);
  }

  return {
    id: data.id,
    tanggal: data.tanggal,
    kasir_id: data.kasir_id,
    total_transaksi: Number(data.total_transaksi || data.jumlah_transaksi || 0),
    total_omzet: Number(data.total_omzet || 0),
    total_tunai: Number(data.total_tunai || 0),
    total_qris: Number(data.total_qris || 0),
    total_piutang: Number(data.total_piutang || 0),
    total_promo: Number(data.total_promo || 0),
    ditutup_pada: data.ditutup_pada,
    kasir_nama: (data as any).users?.nama || 'Kasir',
  } as DailyClosing;
}

export async function reopenDailyClosing(closingId: number, userId?: number): Promise<boolean> {
  // First try via server API route
  try {
    const url = userId ? `/api/daily-closing?id=${closingId}&user_id=${userId}` : `/api/daily-closing?id=${closingId}`;
    const res = await fetch(url, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (res.ok && result.success) {
      return true;
    } else if (result.error) {
      throw new Error(result.error);
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }
    console.warn('API /api/daily-closing DELETE fallback, trying direct client delete:', apiErr);
  }

  const { error } = await supabase.from('daily_closing').delete().eq('id', closingId);
  if (error) {
    console.error('reopenDailyClosing error:', error);
    throw new Error(`Gagal membuka kembali transaksi hari ini: ${error.message}`);
  }
  return true;
}

export async function resetCarwashData(params: {
  userId: number;
  confirmPhrase: string;
}): Promise<{ success: boolean; message: string; details?: any }> {
  const res = await fetch('/api/reset-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      confirm_phrase: params.confirmPhrase,
    }),
  });

  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Gagal mereset data aplikasi.');
  }

  return result;
}


export async function getKasirClosingPreview(tanggal: string, kasirId: number): Promise<{
  total_selesai: number;
  total_omzet: number;
  breakdown: { Tunai: number; NonTunai: number; Qris: number; Promo: number; Piutang: number; Lainnya: number };
  transaksi_proses: Transaction[];
  sudah_tutup: boolean;
  closing_info: DailyClosing | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      total_selesai: 0,
      total_omzet: 0,
      breakdown: { Tunai: 0, NonTunai: 0, Qris: 0, Promo: 0, Piutang: 0, Lainnya: 0 },
      transaksi_proses: [],
      sudah_tutup: false,
      closing_info: null,
    };
  }

  // 1. Cek apakah kasir ini sudah tutup hari ini
  const closingInfo = await getDailyClosing(tanggal, kasirId);

  // 2. Ambil transaksi kasir hari ini yang aktif
  const trxs = await getTransactions({
    startDate: tanggal,
    endDate: tanggal,
    kasirId,
    status: 'aktif',
  });

  const selesaiList = trxs.filter((t) => t.status_pengerjaan === 'selesai');
  const prosesList = trxs.filter((t) => t.status_pengerjaan === 'proses');

  const breakdown = { Tunai: 0, NonTunai: 0, Qris: 0, Promo: 0, Piutang: 0, Lainnya: 0 };
  let total_omzet = 0;

  for (const t of selesaiList) {
    const val = Number(t.harga || 0);
    total_omzet += val;
    const mb = (t.metode_bayar || '').toLowerCase().trim();
    if (mb === 'tunai') {
      breakdown.Tunai += val;
    } else if (mb === 'non tunai' || mb === 'nontunai' || mb === 'qris' || mb === 'transfer') {
      breakdown.NonTunai += val;
      breakdown.Qris += val;
    } else if (mb === 'promo') {
      breakdown.Promo += val;
    } else if (mb === 'piutang') {
      breakdown.Piutang += val;
    } else {
      breakdown.Lainnya += val;
    }
  }

  return {
    total_selesai: selesaiList.length,
    total_omzet,
    breakdown,
    transaksi_proses: prosesList,
    sudah_tutup: Boolean(closingInfo),
    closing_info: closingInfo,
  };
}

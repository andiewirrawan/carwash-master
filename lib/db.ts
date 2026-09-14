import { supabase } from './supabase';
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
  Attendance
} from '@/types/database';

if (!supabase) {
  console.warn("Supabase client is not initialized. Check your environment variables.");
}

// -------------------------------------------------------------
// VEHICLE CATEGORIES
// -------------------------------------------------------------
export async function getVehicleCategories(): Promise<VehicleCategory[]> {
  const { data, error } = await supabase!.from('vehicle_categories').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getVehicleCategories error:', error);
    return [];
  }
  return data as VehicleCategory[];
}

export async function addVehicleCategory(item: Omit<VehicleCategory, 'id'>): Promise<VehicleCategory> {
  const { data, error } = await supabase!.from('vehicle_categories').insert([item]).select().single();
  if (error) throw error;
  return data as VehicleCategory;
}

export async function updateVehicleCategory(id: number, item: Partial<VehicleCategory>): Promise<VehicleCategory | null> {
  const { data, error } = await supabase!.from('vehicle_categories').update(item).eq('id', id).select().single();
  if (error) throw error;
  return data as VehicleCategory;
}

export async function deleteVehicleCategory(id: number): Promise<boolean> {
  const { error } = await supabase!.from('vehicle_categories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// -------------------------------------------------------------
// PRICE LIST & PRICE LIST KOMISI
// -------------------------------------------------------------
export async function getPriceListKomisi(priceListId?: number): Promise<PriceListKomisi[]> {
  let query = supabase!.from('price_list_komisi').select('*').order('id', { ascending: true });
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

export async function savePriceListKomisi(priceListId: number, roles: { peran: string; komisi: number }[]): Promise<PriceListKomisi[]> {
  await supabase!.from('price_list_komisi').delete().eq('price_list_id', priceListId);
  if (roles.length > 0) {
    const payload = roles.map((r) => ({
      price_list_id: priceListId,
      peran: r.peran.trim(),
      komisi: Number(r.komisi) || 0,
    }));
    const { data, error } = await supabase!.from('price_list_komisi').insert(payload).select();
    if (error) throw error;
    return data as PriceListKomisi[];
  }
  return [];
}

export async function getPriceList(): Promise<PriceList[]> {
  const { data, error } = await supabase!.from('price_list').select('*').order('id', { ascending: true });
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

export async function addPriceList(item: Omit<PriceList, 'id'>, komisiList?: { peran: string; komisi: number }[]): Promise<PriceList> {
  const payload = {
    kendaraan: item.kendaraan,
    paket: item.paket || item.paket_nama || '',
    fasilitas: item.fasilitas,
    tipe: item.tipe,
    harga: Number(item.harga) || 0,
  };
  const { data, error } = await supabase!.from('price_list').insert([payload]).select().single();
  if (error) throw error;
  const createdItem = { ...data, harga: Number(data.harga) || 0, paket_nama: data.paket } as PriceList;
  if (komisiList && komisiList.length > 0) {
    createdItem.komisi_list = await savePriceListKomisi(createdItem.id, komisiList);
  }
  return createdItem;
}

export async function updatePriceList(id: number, item: Partial<PriceList>, komisiList?: { peran: string; komisi: number }[]): Promise<PriceList | null> {
  const payload: Record<string, any> = {};
  if (item.kendaraan !== undefined) payload.kendaraan = item.kendaraan;
  if (item.paket !== undefined) payload.paket = item.paket;
  if (item.fasilitas !== undefined) payload.fasilitas = item.fasilitas;
  if (item.tipe !== undefined) payload.tipe = item.tipe;
  if (item.harga !== undefined) payload.harga = Number(item.harga) || 0;

  const { data, error } = await supabase!.from('price_list').update(payload).eq('id', id).select().single();
  if (error) throw error;
  let updatedItem = { ...data, harga: Number(data.harga) || 0, paket_nama: data.paket } as PriceList;
  if (komisiList !== undefined) {
    updatedItem.komisi_list = await savePriceListKomisi(id, komisiList);
  }
  return updatedItem;
}

export async function deletePriceList(id: number): Promise<boolean> {
  // Assuming ON DELETE CASCADE in db for price_list_komisi, but explicit delete just in case
  await supabase!.from('price_list_komisi').delete().eq('price_list_id', id);
  const { error } = await supabase!.from('price_list').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// -------------------------------------------------------------
// STAFF
// -------------------------------------------------------------
export async function getStaffList(): Promise<Staff[]> {
  const { data, error } = await supabase!.from('staff').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getStaffList error:', error);
    return [];
  }
  return data as Staff[];
}

export async function addStaff(item: Omit<Staff, 'id'>): Promise<Staff> {
  const { data, error } = await supabase!.from('staff').insert([item]).select().single();
  if (error) throw error;
  return data as Staff;
}

export async function updateStaff(id: number, item: Partial<Staff>): Promise<Staff | null> {
  const { data, error } = await supabase!.from('staff').update(item).eq('id', id).select().single();
  if (error) throw error;
  return data as Staff;
}

export async function deleteStaff(id: number): Promise<boolean> {
  const { error } = await supabase!.from('staff').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// -------------------------------------------------------------
// STAFF KOMISI MULTIPLIER
// -------------------------------------------------------------
export async function getStaffMultipliers(staffId?: number): Promise<StaffKomisiMultiplier[]> {
  let query = supabase!.from('staff_komisi_multiplier').select('*, staff:staff_id(nama)').order('berlaku_mulai', { ascending: false });
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
  const { data, error } = await supabase!.from('staff_komisi_multiplier').insert([{
    staff_id: item.staff_id,
    multiplier: Number(item.multiplier) || 0,
    berlaku_mulai: item.berlaku_mulai,
    dientry_oleh: item.dientry_oleh
  }]).select().single();
  if (error) throw error;
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
// TRANSACTIONS & TRANSACTION_STAFF
// -------------------------------------------------------------
export async function getTransactions(filters?: { status?: string; startDate?: string; endDate?: string; }): Promise<Transaction[]> {
  let query = supabase!.from('transactions').select('*').order('tanggal', { ascending: false }).order('waktu_selesai', { ascending: false });
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('tanggal', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('tanggal', filters.endDate);
  }
  const { data, error } = await query;
  if (error) {
    console.error('getTransactions error:', error);
    return [];
  }
  return data as Transaction[];
}

export async function getTransactionStaff(): Promise<TransactionStaff[]> {
  const { data, error } = await supabase!.from('transaction_staff').select('*');
  if (error) {
    console.error('getTransactionStaff error:', error);
    return [];
  }
  return data as TransactionStaff[];
}

export async function addTransaction(
  trx: Omit<Transaction, 'id' | 'no_transaksi' | 'created_at'>,
  staffAssignments: Array<{ staff_id: number; peran?: string; komisi: number }>
): Promise<Transaction> {
  const todayCountQuery = await supabase!.from('transactions').select('id', { count: 'exact' }).eq('tanggal', trx.tanggal);
  const countToday = (todayCountQuery.count || 0) + 1;
  const no_transaksi = `TRX-${trx.tanggal.replace(/-/g, '')}-${String(countToday).padStart(3, '0')}`;

  const newTrx = {
    ...trx,
    no_transaksi,
    status_piutang: trx.metode_bayar === 'Piutang' ? (trx.status_piutang || 'belum_lunas') : null,
    waktu_selesai: trx.metode_bayar && trx.metode_bayar !== 'Belum Bayar' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase!.from('transactions').insert([newTrx]).select().single();
  if (error) throw error;

  const savedTrx = data as Transaction;

  if (staffAssignments.length > 0) {
    const staffInserts = staffAssignments.map((s) => ({
      transaction_id: savedTrx.id,
      staff_id: s.staff_id,
      peran: s.peran || 'washer',
      komisi: s.komisi,
    }));
    const { error: staffError } = await supabase!.from('transaction_staff').insert(staffInserts);
    if (staffError) throw staffError;
  }

  // Update customer omzet / kunjungan based on triggers or backend, but we'll do it manually here if needed.
  if (savedTrx.customer_id && savedTrx.status === 'aktif' && savedTrx.status_pengerjaan === 'selesai') {
    const custRes = await supabase!.from('customers').select('total_kunjungan, total_omzet').eq('id', savedTrx.customer_id).single();
    if (custRes.data) {
      const newKunjungan = (custRes.data.total_kunjungan || 0) + 1;
      const newOmzet = (custRes.data.total_omzet || 0) + Number(savedTrx.harga);
      const tier = newKunjungan >= 50 ? 'gold' : 'reguler';
      await supabase!.from('customers').update({
        total_kunjungan: newKunjungan,
        total_omzet: newOmzet,
        tier
      }).eq('id', savedTrx.customer_id);
    }
  }

  return savedTrx;
}

export async function updateTransaction(
  id: number,
  updates: Partial<Transaction>,
  staffAssignments: Array<{ staff_id: number; peran?: string; komisi: number }>
): Promise<void> {
  const { error } = await supabase!.from('transactions').update(updates).eq('id', id);
  if (error) throw error;

  await supabase!.from('transaction_staff').delete().eq('transaction_id', id);
  if (staffAssignments.length > 0) {
    const staffInserts = staffAssignments.map((s) => ({
      transaction_id: id,
      staff_id: s.staff_id,
      peran: s.peran || 'washer',
      komisi: s.komisi,
    }));
    await supabase!.from('transaction_staff').insert(staffInserts);
  }
}

export async function voidTransaction(id: number, alasan: string, userId: number | null): Promise<void> {
  const trxRes = await supabase!.from('transactions').select('status, customer_id, harga').eq('id', id).single();
  
  if (trxRes.data && trxRes.data.status === 'aktif') {
    const { error } = await supabase!.from('transactions').update({ status: 'void' }).eq('id', id);
    if (error) throw error;
    
    await supabase!.from('transaction_void_log').insert([{
      transaction_id: id,
      alasan,
      di_void_oleh: userId,
      tanggal_void: new Date().toISOString(),
    }]);

    // Deduct omzet and visits
    if (trxRes.data.customer_id) {
      const custRes = await supabase!.from('customers').select('total_kunjungan, total_omzet').eq('id', trxRes.data.customer_id).single();
      if (custRes.data) {
        const newKunjungan = Math.max(0, (custRes.data.total_kunjungan || 1) - 1);
        const newOmzet = Math.max(0, (custRes.data.total_omzet || Number(trxRes.data.harga) || 0) - (Number(trxRes.data.harga) || 0));
        const tier = newKunjungan >= 50 ? 'gold' : 'reguler';
        await supabase!.from('customers').update({ total_kunjungan: newKunjungan, total_omzet: newOmzet, tier }).eq('id', trxRes.data.customer_id);
      }
    }
  }
}

// -------------------------------------------------------------
// CUSTOMERS & NOPOL HISTORY
// -------------------------------------------------------------
export async function getCustomers(search?: string): Promise<Customer[]> {
  let query = supabase!.from('customers').select('*').order('id', { ascending: false });
  if (search && search.trim()) {
    query = query.or(`nopol.ilike.%${search}%,nama.ilike.%${search}%,hp.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) {
    console.error('getCustomers error:', error);
    return [];
  }
  return data as Customer[];
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const { data, error } = await supabase!.from('customers').select('*').eq('id', id).single();
  if (error) return null;
  return data as Customer;
}

export async function getCustomerByNopol(nopol: string): Promise<Customer | null> {
  const clean = nopol.trim().toUpperCase();
  const { data, error } = await supabase!.from('customers').select('*').ilike('nopol', clean).single();
  if (error) return null;
  return data as Customer;
}

export async function addCustomer(item: Omit<Customer, 'id'>): Promise<Customer> {
  const payload = {
    ...item,
    tier: 'reguler',
    total_kunjungan: 0,
    total_omzet: 0,
  };
  const { data, error } = await supabase!.from('customers').insert([payload]).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: number, updates: Partial<Customer>): Promise<void> {
  const { error } = await supabase!.from('customers').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getNopolHistory(customerId?: number): Promise<NopolHistory[]> {
  let query = supabase!.from('nopol_history').select('*').order('tanggal_ubah', { ascending: false });
  if (customerId) query = query.eq('customer_id', customerId);
  const { data, error } = await query;
  if (error) {
    console.error('getNopolHistory error:', error);
    return [];
  }
  return data as NopolHistory[];
}

export async function getOldPlateInfo(nopol: string): Promise<NopolHistory | null> {
  const clean = nopol.trim().toUpperCase().replace(/s+/g, ' ');
  const { data, error } = await supabase!.from('nopol_history').select('*').ilike('nopol_lama', clean).limit(1).single();
  if (error) return null;
  return data as NopolHistory;
}

export async function gantiNopol(
  customerId: number,
  nopolBaru: string,
  diubahOleh: number | null,
  diubahOlehNama?: string
): Promise<{ success: boolean; error?: string }> {
  const nopolRegex = /^[A-Z]{1,2}sd{1,4}s[A-Z]{1,3}$/i;
  const cleanNopol = nopolBaru.trim().toUpperCase().replace(/s+/g, ' ');

  if (!nopolRegex.test(cleanNopol)) {
    return { success: false, error: 'Format plat nomor harus berupa: HURUF spasi ANGKA spasi HURUF (contoh: B 1234 BSA)' };
  }

  const { data: customer } = await supabase!.from('customers').select('*').eq('id', customerId).single();
  if (!customer) return { success: false, error: 'Data customer tidak ditemukan' };
  
  if (customer.nopol.toUpperCase() === cleanNopol) {
    return { success: false, error: 'Plat nomor baru sama persis dengan plat nomor saat ini' };
  }

  const { data: exist } = await supabase!.from('customers').select('id').ilike('nopol', cleanNopol).single();
  if (exist) return { success: false, error: `Plat nomor ${cleanNopol} sudah dipakai oleh customer lain.` };

  const { data: retired } = await supabase!.from('nopol_history').select('id').ilike('nopol_lama', cleanNopol).single();
  if (retired) return { success: false, error: `Plat nomor ${cleanNopol} adalah plat lama yang sudah berhenti aktif.` };

  const intensitas = customer.total_kunjungan || 0;

  const newHistoryRecord = {
    customer_id: customerId,
    nopol_lama: customer.nopol,
    nopol_baru: cleanNopol,
    intensitas_saat_pindah: intensitas,
    diubah_oleh: diubahOleh,
    tanggal_ubah: new Date().toISOString(),
  };

  const { error: histError } = await supabase!.from('nopol_history').insert([newHistoryRecord]);
  if (histError) return { success: false, error: histError.message };

  const { error: updError } = await supabase!.from('customers').update({ nopol: cleanNopol }).eq('id', customerId);
  if (updError) return { success: false, error: updError.message };

  return { success: true };
}

export async function getCustomerTransactions(customerId: number): Promise<Transaction[]> {
  const customer = await getCustomerById(customerId);
  if (!customer) return [];
  const history = await getNopolHistory(customerId);
  const pastPlates = history.map(h => h.nopol_lama.toUpperCase());
  
  // Create an array of all associated plates including current
  const allPlates = [customer.nopol.toUpperCase(), ...pastPlates];
  
  const { data, error } = await supabase!
    .from('transactions')
    .select('*')
    .or(`customer_id.eq.${customerId},no_polisi.in.(${allPlates.map(p=>`"${p}"`).join(',')})`)
    .order('tanggal', { ascending: false });
    
  if (error) {
    console.error('getCustomerTransactions error:', error);
    return [];
  }
  return data as Transaction[];
}

// -------------------------------------------------------------
// PIUTANG MANAGEMENT
// -------------------------------------------------------------
export async function getPiutangTransactions(statusFilter: 'belum_lunas' | 'lunas' | 'all' = 'belum_lunas', search?: string): Promise<Transaction[]> {
  let query = supabase!.from('transactions').select('*, customers(nama, hp)').eq('metode_bayar', 'Piutang').eq('status', 'aktif').order('tanggal', { ascending: false });
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
  let trxs = (data as any[]).map(t => ({
    ...t,
    customer_nama: t.customers?.nama || t.customer_nama,
    customer_hp: t.customers?.hp || t.customer_hp,
  })) as Transaction[];
  
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    trxs = trxs.filter(t => 
      t.no_transaksi?.toLowerCase().includes(q) ||
      t.no_polisi?.toLowerCase().includes(q) ||
      t.customer_nama?.toLowerCase().includes(q) ||
      t.paket_nama?.toLowerCase().includes(q)
    );
  }
  return trxs;
}

export async function markPiutangLunas(transactionId: number): Promise<boolean> {
  const { error } = await supabase!.from('transactions').update({ status_piutang: 'lunas', tanggal_lunas: new Date().toISOString() }).eq('id', transactionId);
  if (error) throw error;
  return true;
}

// -------------------------------------------------------------
// KOMISI MANUAL
// -------------------------------------------------------------
export async function getKomisiManual(): Promise<KomisiManual[]> {
  const { data, error } = await supabase!.from('komisi_manual').select('*, staff:staff_id(nama)').order('tanggal', { ascending: false });
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
  const { data, error } = await supabase!.from('komisi_manual').insert([item]).select().single();
  if (error) throw error;
  return data as KomisiManual;
}

// -------------------------------------------------------------
// SQL VIEWS INTEGRATION
// -------------------------------------------------------------
export async function getLaporanHarian(): Promise<LaporanHarian[]> {
  const { data, error } = await supabase!.from('laporan_harian').select('*').order('tanggal', { ascending: false });
  if (error) {
    console.error('getLaporanHarian error:', error);
    return [];
  }
  return data as LaporanHarian[];
}

export async function getLaporanHarianRange(startDate: string, endDate: string): Promise<LaporanHarian[]> {
  const { data, error } = await supabase!.from('laporan_harian').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: false });
  if (error) {
    console.error('getLaporanHarianRange error:', error);
    return [];
  }
  return data as LaporanHarian[];
}

export async function getLaporanBulanan(year?: number): Promise<LaporanBulanan[]> {
  let query = supabase!.from('laporan_bulanan').select('*').order('bulan', { ascending: false });
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
  let query = supabase!.from('komisi_per_staff').select('*');
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
// USERS (KELOLA USER)
// -------------------------------------------------------------
export async function getUsersList(): Promise<User[]> {
  console.log("getUsersList called. supabase is:", !!supabase);
  const { data, error } = await supabase!.from('users').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getUsersList error:', error);
    return [];
  }
  return data as User[];
}

export async function addUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
  const { data, error } = await supabase!.from('users').insert([user]).select().single();
  if (error) throw error;
  return data as User;
}

export async function updateUser(id: number, item: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase!.from('users').update(item).eq('id', id).select().single();
  if (error) throw error;
  return data as User;
}

export async function resetPassword(id: number, newPasswordHash: string): Promise<boolean> {
  const { error } = await supabase!.from('users').update({ password_hash: newPasswordHash }).eq('id', id);
  if (error) throw error;
  return true;
}

export async function deleteUser(id: number): Promise<boolean> {
  const { error } = await supabase!.from('users').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export const SUPABASE_MIGRATION_SQL = `
-- Supabase Migration SQL has been extracted for deployment
-- No longer needed here as a string for dummy reasons, but exported to satisfy types.
`;

// -------------------------------------------------------------
// ATTENDANCE
// -------------------------------------------------------------
export async function getAttendanceList(startDate?: string, endDate?: string): Promise<Attendance[]> {
  let query = supabase!.from('attendance').select('*, staff:staff_id(nama, role)').order('tanggal', { ascending: false });
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
  const { data, error } = await supabase!.from('attendance').insert([item]).select().single();
  if (error) throw error;
  return data as Attendance;
}

export async function updateAttendance(id: number, updates: Partial<Attendance>): Promise<void> {
  const { error } = await supabase!.from('attendance').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteAttendance(id: number): Promise<void> {
  const { error } = await supabase!.from('attendance').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// DAILY CLOSING
// -------------------------------------------------------------
export interface DailyClosing {
  id: number;
  tanggal: string;
  total_omzet: number;
  total_tunai: number;
  total_qris: number;
  total_piutang: number;
  jumlah_transaksi: number;
  closed_by: number | null;
  created_at: string;
  closed_by_nama?: string;
}

export async function getDailyClosingList(): Promise<DailyClosing[]> {
  const { data, error } = await supabase!.from('daily_closing').select('*, users:closed_by(nama)').order('tanggal', { ascending: false });
  if (error) {
    console.error('getDailyClosingList error:', error);
    return [];
  }
  return (data as any[]).map(d => ({
    ...d,
    closed_by_nama: d.users?.nama
  })) as DailyClosing[];
}

export async function addDailyClosing(item: Omit<DailyClosing, 'id' | 'created_at'>): Promise<DailyClosing> {
  const { data, error } = await supabase!.from('daily_closing').insert([item]).select().single();
  if (error) throw error;
  return data as DailyClosing;
}

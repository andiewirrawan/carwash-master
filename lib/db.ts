import { supabase, isSupabaseConfigured } from './supabase';
import {
  VehicleCategory,
  PriceList,
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
  AttendanceStatus,
  StaffWeeklyIncentive,
} from '@/types/database';
import {
  initialVehicleCategories,
  initialPriceList,
  initialStaff,
  initialStaffMultipliers,
  initialUsers,
  initialAttendance,
} from './seedData';

// Local storage keys
const STORAGE_KEYS = {
  VEHICLES: 'bsa_carwash_vehicles',
  PRICE_LIST: 'bsa_carwash_price_list',
  STAFF: 'bsa_carwash_staff',
  STAFF_MULTIPLIERS: 'bsa_carwash_staff_multipliers',
  USERS: 'bsa_carwash_users',
  TRANSACTIONS: 'bsa_carwash_transactions',
  TRANSACTION_STAFF: 'bsa_carwash_transaction_staff',
  CUSTOMERS: 'bsa_carwash_customers',
  NOPOL_HISTORY: 'bsa_carwash_nopol_history',
  KOMISI_MANUAL: 'bsa_carwash_komisi_manual',
  TRANSACTION_VOID_LOG: 'bsa_carwash_transaction_void_log',
  ATTENDANCE: 'bsa_carwash_attendance',
};

// Seed Transactions for realistic dashboard & reporting (from 2026-08-15 to 2026-09-12)
const initialTransactions: Transaction[] = [
  {
    id: 1,
    no_transaksi: 'TRX-20260901-001',
    tanggal: '2026-09-01',
    customer_id: 1,
    no_polisi: 'B 1234 BSA',
    kendaraan: 'Mobil',
    tipe: 'Medium',
    paket_nama: 'Cuci Salju + Wax',
    harga: 65000,
    komisi_washer: 12000,
    komisi_checker: 3000,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-01T08:30:00Z',
  },
  {
    id: 2,
    no_transaksi: 'TRX-20260901-002',
    tanggal: '2026-09-01',
    customer_id: 3,
    no_polisi: 'B 8889 KLA',
    kendaraan: 'Mobil',
    tipe: 'Large',
    paket_nama: 'Cuci Komplit + Jamur Kaca',
    harga: 120000,
    komisi_washer: 25000,
    komisi_checker: 5000,
    metode_bayar: 'Qris',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-01T09:15:00Z',
  },
  {
    id: 3,
    no_transaksi: 'TRX-20260902-001',
    tanggal: '2026-09-02',
    customer_id: 4,
    no_polisi: 'D 4321 JKT',
    kendaraan: 'Mobil',
    tipe: 'Small',
    paket_nama: 'Cuci Body + Vacum',
    harga: 50000,
    komisi_washer: 10000,
    komisi_checker: 2500,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-02T10:00:00Z',
  },
  {
    id: 4,
    no_transaksi: 'TRX-20260903-001',
    tanggal: '2026-09-03',
    customer_id: 5,
    no_polisi: 'B 9912 OPN',
    kendaraan: 'Motor',
    tipe: 'Besar',
    paket_nama: 'Cuci Hidrolik Salju',
    harga: 30000,
    komisi_washer: 6000,
    komisi_checker: 1500,
    metode_bayar: 'Qris',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-03T11:20:00Z',
  },
  {
    id: 5,
    no_transaksi: 'TRX-20260905-001',
    tanggal: '2026-09-05',
    customer_id: 6,
    no_polisi: 'F 5543 POL',
    kendaraan: 'Mobil',
    tipe: 'Luxury',
    paket_nama: 'Premium Detailing + Coating',
    harga: 250000,
    komisi_washer: 50000,
    komisi_checker: 10000,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-05T13:45:00Z',
  },
  {
    id: 6,
    no_transaksi: 'TRX-20260908-001',
    tanggal: '2026-09-08',
    customer_id: 7,
    no_polisi: 'B 3020 JKP',
    kendaraan: 'Mobil',
    tipe: 'Medium',
    paket_nama: 'Cuci Salju + Wax',
    harga: 65000,
    komisi_washer: 12000,
    komisi_checker: 3000,
    metode_bayar: 'Piutang',
    status_piutang: 'lunas',
    tanggal_lunas: '2026-09-09T16:00:00Z',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-08T14:10:00Z',
  },
  {
    id: 7,
    no_transaksi: 'TRX-20260910-001',
    tanggal: '2026-09-10',
    customer_id: 8,
    no_polisi: 'B 7771 ABC',
    kendaraan: 'Mobil',
    tipe: 'Small',
    paket_nama: 'Cuci Body + Vacum',
    harga: 50000,
    komisi_washer: 10000,
    komisi_checker: 2500,
    metode_bayar: 'Piutang',
    status_piutang: 'belum_lunas',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-10T09:00:00Z',
  },
  {
    id: 8,
    no_transaksi: 'TRX-20260911-001',
    tanggal: '2026-09-11',
    customer_id: 9,
    no_polisi: 'B 2234 DEF',
    kendaraan: 'Mobil',
    tipe: 'Large',
    paket_nama: 'Cuci Komplit + Jamur Kaca',
    harga: 120000,
    komisi_washer: 25000,
    komisi_checker: 5000,
    metode_bayar: 'Piutang',
    status_piutang: 'belum_lunas',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-11T10:30:00Z',
  },
  {
    id: 9,
    no_transaksi: 'TRX-20260912-001',
    tanggal: '2026-09-12',
    customer_id: 1,
    no_polisi: 'B 1234 BSA',
    kendaraan: 'Mobil',
    tipe: 'Medium',
    paket_nama: 'Cuci Salju + Wax',
    harga: 65000,
    komisi_washer: 12000,
    komisi_checker: 3000,
    metode_bayar: 'Qris',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-12T08:15:00Z',
  },
  {
    id: 10,
    no_transaksi: 'TRX-20260912-002',
    tanggal: '2026-09-12',
    customer_id: 2,
    no_polisi: 'D 5678 XYZ',
    kendaraan: 'Mobil',
    tipe: 'Small',
    paket_nama: 'Cuci Body + Vacum',
    harga: 50000,
    komisi_washer: 10000,
    komisi_checker: 2500,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-12T09:40:00Z',
  },
  {
    id: 11,
    no_transaksi: 'TRX-20260912-003',
    tanggal: '2026-09-12',
    customer_id: 5,
    no_polisi: 'B 9912 OPN',
    kendaraan: 'Motor',
    tipe: 'Besar',
    paket_nama: 'Cuci Hidrolik Salju',
    harga: 30000,
    komisi_washer: 6000,
    komisi_checker: 1500,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-09-12T11:00:00Z',
  },
  // August 2026 Transactions for Monthly Comparison
  {
    id: 12,
    no_transaksi: 'TRX-20260815-001',
    tanggal: '2026-08-15',
    customer_id: 1,
    no_polisi: 'B 1234 BSA',
    kendaraan: 'Mobil',
    tipe: 'Medium',
    paket_nama: 'Cuci Salju + Wax',
    harga: 65000,
    komisi_washer: 12000,
    komisi_checker: 3000,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-08-15T10:00:00Z',
  },
  {
    id: 13,
    no_transaksi: 'TRX-20260820-001',
    tanggal: '2026-08-20',
    customer_id: 3,
    no_polisi: 'B 8889 KLA',
    kendaraan: 'Mobil',
    tipe: 'Large',
    paket_nama: 'Cuci Komplit + Jamur Kaca',
    harga: 120000,
    komisi_washer: 25000,
    komisi_checker: 5000,
    metode_bayar: 'Qris',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-08-20T11:30:00Z',
  },
  {
    id: 14,
    no_transaksi: 'TRX-20260828-001',
    tanggal: '2026-08-28',
    customer_id: 6,
    no_polisi: 'F 5543 POL',
    kendaraan: 'Mobil',
    tipe: 'Luxury',
    paket_nama: 'Premium Detailing + Coating',
    harga: 250000,
    komisi_washer: 50000,
    komisi_checker: 10000,
    metode_bayar: 'Tunai',
    status: 'aktif',
    created_by: 'admin',
    created_at: '2026-08-28T14:00:00Z',
  },
];

const initialTransactionStaff: TransactionStaff[] = [
  { id: 1, transaction_id: 1, staff_id: 1, komisi: 6000 },
  { id: 2, transaction_id: 1, staff_id: 2, komisi: 6000 },
  { id: 3, transaction_id: 1, staff_id: 4, komisi: 3000 },
  { id: 4, transaction_id: 2, staff_id: 1, komisi: 12500 },
  { id: 5, transaction_id: 2, staff_id: 3, komisi: 12500 },
  { id: 6, transaction_id: 2, staff_id: 4, komisi: 5000 },
  { id: 7, transaction_id: 3, staff_id: 2, komisi: 10000 },
  { id: 8, transaction_id: 3, staff_id: 4, komisi: 2500 },
  { id: 9, transaction_id: 4, staff_id: 3, komisi: 6000 },
  { id: 10, transaction_id: 5, staff_id: 1, komisi: 25000 },
  { id: 11, transaction_id: 5, staff_id: 2, komisi: 25000 },
  { id: 12, transaction_id: 5, staff_id: 5, komisi: 10000 },
  { id: 13, transaction_id: 6, staff_id: 2, komisi: 12000 },
  { id: 14, transaction_id: 6, staff_id: 4, komisi: 3000 },
  { id: 15, transaction_id: 7, staff_id: 1, komisi: 10000 },
  { id: 16, transaction_id: 7, staff_id: 4, komisi: 2500 },
  { id: 17, transaction_id: 8, staff_id: 2, komisi: 12500 },
  { id: 18, transaction_id: 8, staff_id: 3, komisi: 12500 },
  { id: 19, transaction_id: 8, staff_id: 4, komisi: 5000 },
  { id: 20, transaction_id: 9, staff_id: 1, komisi: 6000 },
  { id: 21, transaction_id: 9, staff_id: 3, komisi: 6000 },
  { id: 22, transaction_id: 9, staff_id: 4, komisi: 3000 },
  { id: 23, transaction_id: 10, staff_id: 2, komisi: 10000 },
  { id: 24, transaction_id: 10, staff_id: 5, komisi: 2500 },
  { id: 25, transaction_id: 11, staff_id: 1, komisi: 6000 },
  { id: 26, transaction_id: 12, staff_id: 1, komisi: 12000 },
  { id: 27, transaction_id: 13, staff_id: 2, komisi: 25000 },
  { id: 28, transaction_id: 14, staff_id: 1, komisi: 50000 },
];

// Helper for local storage retrieval with fallback seed
function getLocalData<T>(key: string, defaultData: T[]): T[] {
  if (typeof window === 'undefined') return defaultData;
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local storage:', err);
    return defaultData;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error writing local storage:', err);
  }
}

// -------------------------------------------------------------
// VEHICLE CATEGORIES
// -------------------------------------------------------------
export async function getVehicleCategories(): Promise<VehicleCategory[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('vehicle_categories')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) return data as VehicleCategory[];
    } catch (e) {
      console.warn('Supabase getVehicleCategories failed, using fallback:', e);
    }
  }
  return getLocalData<VehicleCategory>(STORAGE_KEYS.VEHICLES, initialVehicleCategories);
}

export async function addVehicleCategory(
  item: Omit<VehicleCategory, 'id'>
): Promise<VehicleCategory> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('vehicle_categories')
        .insert([item])
        .select()
        .single();
      if (!error && data) return data as VehicleCategory;
    } catch (e) {
      console.warn('Supabase insert failed, saving locally:', e);
    }
  }

  const items = getLocalData<VehicleCategory>(STORAGE_KEYS.VEHICLES, initialVehicleCategories);
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: VehicleCategory = { ...item, id: nextId };
  items.push(newItem);
  setLocalData(STORAGE_KEYS.VEHICLES, items);
  return newItem;
}

export async function updateVehicleCategory(
  id: number,
  item: Partial<VehicleCategory>
): Promise<VehicleCategory | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('vehicle_categories')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as VehicleCategory;
    } catch (e) {
      console.warn('Supabase update failed, saving locally:', e);
    }
  }

  const items = getLocalData<VehicleCategory>(STORAGE_KEYS.VEHICLES, initialVehicleCategories);
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...item };
  setLocalData(STORAGE_KEYS.VEHICLES, items);
  return items[index];
}

export async function deleteVehicleCategory(id: number): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('vehicle_categories').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase delete failed:', e);
    }
  }

  const items = getLocalData<VehicleCategory>(STORAGE_KEYS.VEHICLES, initialVehicleCategories);
  const filtered = items.filter((i) => i.id !== id);
  setLocalData(STORAGE_KEYS.VEHICLES, filtered);
  return true;
}

// -------------------------------------------------------------
// PRICE LIST
// -------------------------------------------------------------
export async function getPriceList(): Promise<PriceList[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) {
        return (data as any[]).map((p) => ({
          ...p,
          paket_nama: p.paket_nama || p.paket,
        })) as PriceList[];
      }
    } catch (e) {
      console.warn('Supabase getPriceList failed, using fallback:', e);
    }
  }
  return getLocalData<PriceList>(STORAGE_KEYS.PRICE_LIST, initialPriceList).map((p) => ({
    ...p,
    paket_nama: p.paket_nama || p.paket,
  }));
}

export async function addPriceList(item: Omit<PriceList, 'id'>): Promise<PriceList> {
  const payload = {
    ...item,
    paket: item.paket || item.paket_nama || '',
    paket_nama: item.paket_nama || item.paket || '',
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .insert([payload])
        .select()
        .single();
      if (!error && data) return data as PriceList;
    } catch (e) {
      console.warn('Supabase insert price_list failed:', e);
    }
  }

  const items = getLocalData<PriceList>(STORAGE_KEYS.PRICE_LIST, initialPriceList);
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: PriceList = { ...payload, id: nextId };
  items.push(newItem);
  setLocalData(STORAGE_KEYS.PRICE_LIST, items);
  return newItem;
}

export async function updatePriceList(
  id: number,
  item: Partial<PriceList>
): Promise<PriceList | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as PriceList;
    } catch (e) {
      console.warn('Supabase update price_list failed:', e);
    }
  }

  const items = getLocalData<PriceList>(STORAGE_KEYS.PRICE_LIST, initialPriceList);
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...item };
  setLocalData(STORAGE_KEYS.PRICE_LIST, items);
  return items[index];
}

export async function deletePriceList(id: number): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('price_list').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase delete price_list failed:', e);
    }
  }

  const items = getLocalData<PriceList>(STORAGE_KEYS.PRICE_LIST, initialPriceList);
  const filtered = items.filter((i) => i.id !== id);
  setLocalData(STORAGE_KEYS.PRICE_LIST, filtered);
  return true;
}

// -------------------------------------------------------------
// STAFF
// -------------------------------------------------------------
export async function getStaffList(): Promise<Staff[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) return data as Staff[];
    } catch (e) {
      console.warn('Supabase getStaffList failed:', e);
    }
  }
  return getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
}

export async function addStaff(item: Omit<Staff, 'id'>): Promise<Staff> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([item])
        .select()
        .single();
      if (!error && data) return data as Staff;
    } catch (e) {
      console.warn('Supabase addStaff failed:', e);
    }
  }

  const items = getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: Staff = { ...item, id: nextId };
  items.push(newItem);
  setLocalData(STORAGE_KEYS.STAFF, items);

  // Default initial 0% multiplier entry for new staff
  await addStaffMultiplier({
    staff_id: nextId,
    multiplier: 0,
    berlaku_mulai: new Date().toISOString().split('T')[0],
    dientry_oleh: null,
    dientry_oleh_nama: 'System',
    created_at: new Date().toISOString(),
  });

  return newItem;
}

export async function updateStaff(id: number, item: Partial<Staff>): Promise<Staff | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Staff;
    } catch (e) {
      console.warn('Supabase updateStaff failed:', e);
    }
  }

  const items = getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...item };
  setLocalData(STORAGE_KEYS.STAFF, items);
  return items[index];
}

export async function deleteStaff(id: number): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase deleteStaff failed:', e);
    }
  }

  const items = getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
  const filtered = items.filter((i) => i.id !== id);
  setLocalData(STORAGE_KEYS.STAFF, filtered);
  return true;
}

// -------------------------------------------------------------
// STAFF KOMISI MULTIPLIER
// -------------------------------------------------------------
export async function getStaffMultipliers(staffId?: number): Promise<StaffKomisiMultiplier[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('staff_komisi_multiplier')
        .select('*')
        .order('berlaku_mulai', { ascending: false });
      if (staffId) {
        query = query.eq('staff_id', staffId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return (data as any[]).map((d) => ({
          id: d.id,
          staff_id: d.staff_id,
          multiplier: d.multiplier,
          berlaku_mulai: d.berlaku_mulai || '2026-09-01',
          dientry_oleh: d.dientry_oleh || null,
          dientry_oleh_nama: d.dientry_oleh_nama || 'System',
          created_at: d.created_at || new Date().toISOString(),
          tanggal: d.berlaku_mulai || '2026-09-01',
        }));
      }
    } catch (e) {
      console.warn('Supabase getStaffMultipliers failed:', e);
    }
  }

  const all = getLocalData<StaffKomisiMultiplier>(
    STORAGE_KEYS.STAFF_MULTIPLIERS,
    initialStaffMultipliers
  );

  const filtered = staffId ? all.filter((m) => m.staff_id === staffId) : all;
  return filtered
    .sort((a, b) => new Date(b.berlaku_mulai).getTime() - new Date(a.berlaku_mulai).getTime())
    .map((m) => ({
      ...m,
      tanggal: m.berlaku_mulai,
    }));
}

export async function addStaffMultiplier(
  item: Omit<StaffKomisiMultiplier, 'id'>
): Promise<StaffKomisiMultiplier> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('staff_komisi_multiplier')
        .insert([item])
        .select()
        .single();
      if (!error && data) return data as StaffKomisiMultiplier;
    } catch (e) {
      console.warn('Supabase addStaffMultiplier failed:', e);
    }
  }

  const items = getLocalData<StaffKomisiMultiplier>(
    STORAGE_KEYS.STAFF_MULTIPLIERS,
    initialStaffMultipliers
  );
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: StaffKomisiMultiplier = { ...item, id: nextId };
  items.push(newItem);
  setLocalData(STORAGE_KEYS.STAFF_MULTIPLIERS, items);
  return newItem;
}

export async function getEffectiveMultiplierForDate(
  staffId: number,
  targetDateStr: string
): Promise<number> {
  const multipliers = getLocalData<StaffKomisiMultiplier>(
    STORAGE_KEYS.STAFF_MULTIPLIERS,
    initialStaffMultipliers
  );
  const targetTime = new Date(targetDateStr).getTime();

  const validRows = multipliers.filter(
    (m) => m.staff_id === staffId && new Date(m.berlaku_mulai).getTime() <= targetTime
  );

  if (validRows.length === 0) return 0;
  validRows.sort(
    (a, b) => new Date(b.berlaku_mulai).getTime() - new Date(a.berlaku_mulai).getTime()
  );
  return validRows[0].multiplier;
}

// -------------------------------------------------------------
// TRANSACTIONS & TRANSACTION_STAFF
// -------------------------------------------------------------
export async function getTransactions(filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Transaction[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('transactions').select('*').order('tanggal', { ascending: false });
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
      if (!error && data) return data as Transaction[];
    } catch (e) {
      console.warn('Supabase getTransactions failed:', e);
    }
  }

  let items = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  if (filters?.status) {
    items = items.filter((t) => t.status === filters.status);
  }
  if (filters?.startDate) {
    items = items.filter((t) => t.tanggal >= filters.startDate!);
  }
  if (filters?.endDate) {
    items = items.filter((t) => t.tanggal <= filters.endDate!);
  }
  return items.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

export async function getTransactionStaff(): Promise<TransactionStaff[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('transaction_staff').select('*');
      if (!error && data) return data as TransactionStaff[];
    } catch (e) {
      console.warn('Supabase getTransactionStaff failed:', e);
    }
  }
  return getLocalData<TransactionStaff>(STORAGE_KEYS.TRANSACTION_STAFF, initialTransactionStaff);
}

export async function addTransaction(
  trx: Omit<Transaction, 'id' | 'no_transaksi' | 'created_at'>,
  staffAssignments: Array<{ staff_id: number; peran?: string; komisi: number }>
): Promise<Transaction> {
  const items = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const staffItems = getLocalData<TransactionStaff>(
    STORAGE_KEYS.TRANSACTION_STAFF,
    initialTransactionStaff
  );

  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const countToday = items.filter((t) => t.tanggal === trx.tanggal).length + 1;
  const no_transaksi = `TRX-${trx.tanggal.replace(/-/g, '')}-${String(countToday).padStart(3, '0')}`;

  const newTrx: Transaction = {
    ...trx,
    id: nextId,
    no_transaksi,
    status_piutang: trx.metode_bayar === 'Piutang' ? (trx.status_piutang || 'belum_lunas') : null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([newTrx])
        .select()
        .single();
      if (!error && data) {
        if (staffAssignments.length > 0) {
          const staffInserts = staffAssignments.map((s) => ({
            transaction_id: data.id,
            staff_id: s.staff_id,
            peran: s.peran || 'washer',
            komisi: s.komisi,
          }));
          await supabase.from('transaction_staff').insert(staffInserts);
        }
        return data as Transaction;
      }
    } catch (e) {
      console.warn('Supabase addTransaction failed:', e);
    }
  }

  items.unshift(newTrx);
  setLocalData(STORAGE_KEYS.TRANSACTIONS, items);

  let nextStaffId = staffItems.length > 0 ? Math.max(...staffItems.map((i) => i.id || 1)) + 1 : 1;
  for (const s of staffAssignments) {
    staffItems.push({
      id: nextStaffId++,
      transaction_id: nextId,
      staff_id: s.staff_id,
      peran: s.peran || 'washer',
      komisi: s.komisi,
    });
  }
  setLocalData(STORAGE_KEYS.TRANSACTION_STAFF, staffItems);

  return newTrx;
}

export async function updateTransaction(
  id: number,
  updates: Partial<Transaction>,
  staffAssignments: Array<{ staff_id: number; peran?: string; komisi: number }>
): Promise<void> {
  const items = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const index = items.findIndex((t) => t.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    setLocalData(STORAGE_KEYS.TRANSACTIONS, items);
  }

  // Update staff assignments
  let staffItems = getLocalData<TransactionStaff>(
    STORAGE_KEYS.TRANSACTION_STAFF,
    initialTransactionStaff
  );
  staffItems = staffItems.filter((s) => s.transaction_id !== id);
  let nextStaffId = staffItems.length > 0 ? Math.max(...staffItems.map((i) => i.id || 1)) + 1 : 1;
  for (const s of staffAssignments) {
    staffItems.push({
      id: nextStaffId++,
      transaction_id: id,
      staff_id: s.staff_id,
      peran: s.peran || 'washer',
      komisi: s.komisi,
    });
  }
  setLocalData(STORAGE_KEYS.TRANSACTION_STAFF, staffItems);
}

export async function voidTransaction(
  id: number,
  alasan: string,
  userId: number | null
): Promise<void> {
  const items = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const index = items.findIndex((t) => t.id === id);
  if (index !== -1) {
    items[index].status = 'void';
    setLocalData(STORAGE_KEYS.TRANSACTIONS, items);
  }

  const voidLogs = getLocalData<TransactionVoidLog>(STORAGE_KEYS.TRANSACTION_VOID_LOG, []);
  voidLogs.push({
    id: voidLogs.length + 1,
    transaction_id: id,
    alasan,
    di_void_oleh: userId,
    tanggal_void: new Date().toISOString(),
  });
  setLocalData(STORAGE_KEYS.TRANSACTION_VOID_LOG, voidLogs);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('transactions').update({ status: 'void' }).eq('id', id);
      await supabase.from('transaction_void_log').insert([
        {
          transaction_id: id,
          alasan,
          di_void_oleh: userId,
          tanggal_void: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn('Supabase voidTransaction failed:', e);
    }
  }
}

// -------------------------------------------------------------
// CUSTOMERS & NOPOL HISTORY (Tahap 4)
// -------------------------------------------------------------
const initialCustomers: Customer[] = [
  {
    id: 1,
    nopol: 'B 1234 BSA',
    nama: 'Budi Santoso',
    hp: '081234567890',
    kendaraan: 'Mobil',
    tier: 'gold', // >= 50 visits
    created_at: '2026-06-01T00:00:00Z',
    total_kunjungan: 52,
    total_omzet: 3850000,
  },
  {
    id: 2,
    nopol: 'D 5678 XYZ',
    nama: 'Siti Rahma',
    hp: '081987654321',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-07-10T00:00:00Z',
    total_kunjungan: 18,
    total_omzet: 1250000,
  },
  {
    id: 3,
    nopol: 'B 8889 KLA',
    nama: 'Hendro Wijaya',
    hp: '081377889900',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-08-01T00:00:00Z',
    total_kunjungan: 14,
    total_omzet: 1680000,
  },
  {
    id: 4,
    nopol: 'D 4321 JKT',
    nama: 'Ahmad Fauzi',
    hp: '085712349988',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-08-05T00:00:00Z',
    total_kunjungan: 8,
    total_omzet: 400000,
  },
  {
    id: 5,
    nopol: 'B 9912 OPN',
    nama: 'Rudi Hermawan',
    hp: '087822334455',
    kendaraan: 'Motor',
    tier: 'reguler',
    created_at: '2026-08-10T00:00:00Z',
    total_kunjungan: 15,
    total_omzet: 450000,
  },
  {
    id: 6,
    nopol: 'F 5543 POL',
    nama: 'Dewi Lestari',
    hp: '081299887766',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-08-15T00:00:00Z',
    total_kunjungan: 24,
    total_omzet: 3100000,
  },
  {
    id: 7,
    nopol: 'B 3020 JKP',
    nama: 'Irwan Setiawan',
    hp: '082133445566',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-08-20T00:00:00Z',
    total_kunjungan: 6,
    total_omzet: 390000,
  },
  {
    id: 8,
    nopol: 'B 7771 ABC',
    nama: 'PT Surya Kencana',
    hp: '081122334455',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-08-25T00:00:00Z',
    total_kunjungan: 5,
    total_omzet: 350000,
  },
  {
    id: 9,
    nopol: 'B 2234 DEF',
    nama: 'CV Maju Lancar',
    hp: '081566778899',
    kendaraan: 'Mobil',
    tier: 'reguler',
    created_at: '2026-08-28T00:00:00Z',
    total_kunjungan: 7,
    total_omzet: 680000,
  },
];

const initialNopolHistory: NopolHistory[] = [
  {
    id: 1,
    customer_id: 1,
    nopol_lama: 'B 9999 OLD',
    nopol_baru: 'B 1234 BSA',
    intensitas_saat_pindah: 30,
    diubah_oleh: 1,
    diubah_oleh_nama: 'Wiro (sistem_owner)',
    tanggal_ubah: '2026-07-15T14:20:00Z',
  },
];

export async function getCustomers(search?: string): Promise<Customer[]> {
  let customers: Customer[] = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: false });
      if (!error && data) customers = data as Customer[];
    } catch (e) {
      console.warn('Supabase getCustomers failed:', e);
    }
  }
  if (customers.length === 0) {
    customers = getLocalData<Customer>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  }

  // Active transactions (void transactions are excluded)
  const transactions = await getTransactions({ status: 'aktif' });
  const nopolHistory = await getNopolHistory();

  const enriched = customers.map((c) => {
    // Collect all historical plates for this customer
    const pastPlates = nopolHistory
      .filter((h) => h.customer_id === c.id)
      .map((h) => h.nopol_lama.toUpperCase());

    const matchingTrxs = transactions.filter(
      (t) =>
        t.customer_id === c.id ||
        (t.no_polisi && t.no_polisi.toUpperCase() === c.nopol.toUpperCase()) ||
        (t.no_polisi && pastPlates.includes(t.no_polisi.toUpperCase()))
    );

    // Dynamic count and omzet
    const count = Math.max(c.total_kunjungan || 0, matchingTrxs.length);
    const calculatedOmzet = matchingTrxs.reduce((sum, t) => sum + (Number(t.harga) || 0), 0);
    const omzet = Math.max(c.total_omzet || 0, calculatedOmzet);

    // Auto-update tier: lifetime active visits >= 50 => 'gold', else 'reguler'
    const tier = count >= 50 ? 'gold' : 'reguler';

    return {
      ...c,
      total_kunjungan: count,
      total_omzet: omzet,
      tier,
    };
  });

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    return enriched.filter(
      (c) =>
        c.nopol.toLowerCase().includes(q) ||
        (c.nama && c.nama.toLowerCase().includes(q)) ||
        (c.hp && c.hp.toLowerCase().includes(q)) ||
        (c.kendaraan && c.kendaraan.toLowerCase().includes(q))
    );
  }

  return enriched;
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const customers = await getCustomers();
  const found = customers.find((c) => c.id === id);
  return found || null;
}

export async function getCustomerByNopol(nopol: string): Promise<Customer | null> {
  const clean = nopol.trim().toUpperCase();
  const customers = await getCustomers();
  const found = customers.find((c) => c.nopol.toUpperCase() === clean);
  return found || null;
}

export async function addCustomer(item: Omit<Customer, 'id'>): Promise<Customer> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('customers').insert([item]).select().single();
      if (!error && data) return data as Customer;
    } catch (e) {
      console.warn('Supabase addCustomer failed:', e);
    }
  }

  const items = await getCustomers();
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: Customer = { ...item, id: nextId, total_kunjungan: 1, total_omzet: 0, tier: 'reguler' };
  items.push(newItem);
  setLocalData(STORAGE_KEYS.CUSTOMERS, items);
  return newItem;
}

export async function updateCustomer(id: number, updates: Partial<Customer>): Promise<void> {
  const rawCustomers = getLocalData<Customer>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  const idx = rawCustomers.findIndex((c) => c.id === id);
  if (idx !== -1) {
    rawCustomers[idx] = { ...rawCustomers[idx], ...updates };
    setLocalData(STORAGE_KEYS.CUSTOMERS, rawCustomers);
  }
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('customers').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase updateCustomer failed:', e);
    }
  }
}

export async function getNopolHistory(customerId?: number): Promise<NopolHistory[]> {
  let list: NopolHistory[] = [];
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('nopol_history').select('*').order('tanggal_ubah', { ascending: false });
      if (customerId) query = query.eq('customer_id', customerId);
      const { data, error } = await query;
      if (!error && data) list = data as NopolHistory[];
    } catch (e) {
      console.warn('Supabase getNopolHistory failed:', e);
    }
  }
  if (list.length === 0) {
    list = getLocalData<NopolHistory>(STORAGE_KEYS.NOPOL_HISTORY, initialNopolHistory);
  }

  if (customerId) {
    return list
      .filter((h) => h.customer_id === customerId)
      .sort((a, b) => new Date(b.tanggal_ubah).getTime() - new Date(a.tanggal_ubah).getTime());
  }

  return list.sort((a, b) => new Date(b.tanggal_ubah).getTime() - new Date(a.tanggal_ubah).getTime());
}

export async function gantiNopol(
  customerId: number,
  nopolBaru: string,
  diubahOleh: number | null,
  diubahOlehNama?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Regex validation: HURUF spasi ANGKA spasi HURUF
  const nopolRegex = /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/i;
  const cleanNopol = nopolBaru.trim().toUpperCase().replace(/\s+/g, ' ');

  if (!nopolRegex.test(cleanNopol)) {
    return {
      success: false,
      error: 'Format plat nomor harus berupa: HURUF spasi ANGKA spasi HURUF (contoh: B 1234 BSA, D 5678 XYZ)',
    };
  }

  const customers = await getCustomers();
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return { success: false, error: 'Data customer tidak ditemukan' };
  }

  if (customer.nopol.toUpperCase() === cleanNopol) {
    return { success: false, error: 'Plat nomor baru sama persis dengan plat nomor saat ini' };
  }

  // 2. Check if already used by another customer
  const isUsedByOther = customers.some(
    (c) => c.id !== customerId && c.nopol.toUpperCase() === cleanNopol
  );
  if (isUsedByOther) {
    return {
      success: false,
      error: `Plat nomor ${cleanNopol} sudah dipakai oleh customer lain. Silakan periksa kembali.`,
    };
  }

  // 3. Snapshot intensitas saat pindah (total lifetime visits where status = 'aktif')
  const intensitas = customer.total_kunjungan || 0;

  // 4. Save to nopol_history
  const historyList = getLocalData<NopolHistory>(STORAGE_KEYS.NOPOL_HISTORY, initialNopolHistory);
  const nextHistId = historyList.length > 0 ? Math.max(...historyList.map((h) => h.id)) + 1 : 1;

  const newHistoryRecord: NopolHistory = {
    id: nextHistId,
    customer_id: customerId,
    nopol_lama: customer.nopol,
    nopol_baru: cleanNopol,
    intensitas_saat_pindah: intensitas,
    diubah_oleh: diubahOleh,
    diubah_oleh_nama: diubahOlehNama,
    tanggal_ubah: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('nopol_history').insert([newHistoryRecord]);
      await supabase.from('customers').update({ nopol: cleanNopol }).eq('id', customerId);
    } catch (e) {
      console.warn('Supabase gantiNopol failed:', e);
    }
  }

  historyList.unshift(newHistoryRecord);
  setLocalData(STORAGE_KEYS.NOPOL_HISTORY, historyList);

  // Update customer in localStorage
  const rawCustomers = getLocalData<Customer>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  const cIndex = rawCustomers.findIndex((c) => c.id === customerId);
  if (cIndex !== -1) {
    rawCustomers[cIndex].nopol = cleanNopol;
    setLocalData(STORAGE_KEYS.CUSTOMERS, rawCustomers);
  }

  return { success: true };
}

export async function getCustomerTransactions(customerId: number): Promise<Transaction[]> {
  const customer = await getCustomerById(customerId);
  if (!customer) return [];

  const nopolHistory = await getNopolHistory(customerId);
  const pastPlates = nopolHistory.map((h) => h.nopol_lama.toUpperCase());
  const allTrxs = await getTransactions(); // includes 'aktif' and 'void'

  return allTrxs
    .filter(
      (t) =>
        t.customer_id === customerId ||
        (t.no_polisi && t.no_polisi.toUpperCase() === customer.nopol.toUpperCase()) ||
        (t.no_polisi && pastPlates.includes(t.no_polisi.toUpperCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(`${a.tanggal}T${a.waktu || '00:00:00'}`).getTime();
      const dateB = new Date(`${b.tanggal}T${b.waktu || '00:00:00'}`).getTime();
      return dateB - dateA;
    });
}

// -------------------------------------------------------------
// PIUTANG MANAGEMENT (Tahap 4)
// -------------------------------------------------------------
export async function getPiutangTransactions(
  statusFilter: 'belum_lunas' | 'lunas' | 'all' = 'belum_lunas',
  search?: string
): Promise<Transaction[]> {
  const trxs = await getTransactions({ status: 'aktif' }); // Exclude void
  const customers = await getCustomers();

  // Filter only transactions with metode_bayar = 'Piutang'
  let piutangTrxs = trxs.filter((t) => t.metode_bayar === 'Piutang');

  // Enrich customer info if missing
  piutangTrxs = piutangTrxs.map((t) => {
    let nama = t.customer_nama;
    let hp = t.customer_hp;
    let kendaraan = t.kendaraan;

    if (!nama && t.customer_id) {
      const c = customers.find((cust) => cust.id === t.customer_id);
      if (c) {
        nama = c.nama || 'Customer';
        hp = c.hp || '-';
        kendaraan = kendaraan || c.kendaraan || 'Mobil';
      }
    } else if (!nama && t.no_polisi) {
      const c = customers.find((cust) => cust.nopol.toUpperCase() === t.no_polisi?.toUpperCase());
      if (c) {
        nama = c.nama || 'Customer';
        hp = c.hp || '-';
        kendaraan = kendaraan || c.kendaraan || 'Mobil';
      }
    }

    return {
      ...t,
      customer_nama: nama || 'Customer',
      customer_hp: hp || '-',
      kendaraan: kendaraan || 'Mobil',
      status_piutang: t.status_piutang || 'belum_lunas',
    };
  });

  // Filter by status_piutang
  if (statusFilter === 'belum_lunas') {
    piutangTrxs = piutangTrxs.filter((t) => t.status_piutang !== 'lunas');
  } else if (statusFilter === 'lunas') {
    piutangTrxs = piutangTrxs.filter((t) => t.status_piutang === 'lunas');
  }

  // Filter search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    piutangTrxs = piutangTrxs.filter(
      (t) =>
        t.no_transaksi?.toLowerCase().includes(q) ||
        t.no_polisi?.toLowerCase().includes(q) ||
        t.customer_nama?.toLowerCase().includes(q) ||
        t.customer_hp?.toLowerCase().includes(q) ||
        t.paket_nama?.toLowerCase().includes(q)
    );
  }

  return piutangTrxs.sort((a, b) => {
    const dateA = new Date(`${a.tanggal}T${a.waktu || '00:00:00'}`).getTime();
    const dateB = new Date(`${b.tanggal}T${b.waktu || '00:00:00'}`).getTime();
    return dateB - dateA;
  });
}

export async function markPiutangLunas(transactionId: number): Promise<boolean> {
  const items = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const index = items.findIndex((t) => t.id === transactionId);
  const now = new Date().toISOString();

  if (index !== -1) {
    items[index] = {
      ...items[index],
      status_piutang: 'lunas',
      tanggal_lunas: now,
    };
    setLocalData(STORAGE_KEYS.TRANSACTIONS, items);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('transactions')
        .update({ status_piutang: 'lunas', tanggal_lunas: now })
        .eq('id', transactionId);
    } catch (e) {
      console.warn('Supabase markPiutangLunas failed:', e);
    }
  }

  return true;
}

// -------------------------------------------------------------
// KOMISI MANUAL
// -------------------------------------------------------------
export async function getKomisiManual(): Promise<KomisiManual[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('komisi_manual').select('*').order('tanggal', { ascending: false });
      if (!error && data) return data as KomisiManual[];
    } catch (e) {
      console.warn('Supabase getKomisiManual failed:', e);
    }
  }
  return getLocalData<KomisiManual>(STORAGE_KEYS.KOMISI_MANUAL, [
    { id: 1, staff_id: 1, tanggal: '2026-09-05', keterangan: 'Cuci Karpet Extra', nominal: 25000, dientry_oleh: 1, dientry_oleh_nama: 'Wiro (sistem_owner)', created_at: '2026-09-05T10:00:00Z', staff_nama: 'Topa' },
  ]);
}

export async function addKomisiManual(item: Omit<KomisiManual, 'id'>): Promise<KomisiManual> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('komisi_manual').insert([item]).select().single();
      if (!error && data) return data as KomisiManual;
    } catch (e) {
      console.warn('Supabase addKomisiManual failed:', e);
    }
  }

  const items = await getKomisiManual();
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: KomisiManual = { ...item, id: nextId };
  items.unshift(newItem);
  setLocalData(STORAGE_KEYS.KOMISI_MANUAL, items);
  return newItem;
}

// -------------------------------------------------------------
// SQL VIEWS INTEGRATION
// -------------------------------------------------------------

/**
 * SQL View: laporan_harian
 * select tanggal, count(*) as jumlah_transaksi, sum(harga) as omzet,
 *        sum(case when metode_bayar = 'Tunai' then harga else 0 end) as tunai,
 *        sum(case when metode_bayar = 'Qris' then harga else 0 end) as qris,
 *        sum(case when metode_bayar = 'Piutang' then harga else 0 end) as piutang
 * from transactions
 * where status = 'aktif'
 * group by tanggal;
 */
export async function getLaporanHarian(): Promise<LaporanHarian[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('laporan_harian')
        .select('*')
        .order('tanggal', { ascending: false });
      if (!error && data) return data as LaporanHarian[];
    } catch (e) {
      console.warn('Supabase getLaporanHarian view query failed, calculating locally:', e);
    }
  }

  const transactions = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const activeTrxs = transactions.filter((t) => t.status === 'aktif');

  const map = new Map<string, LaporanHarian>();
  for (const t of activeTrxs) {
    const existing = map.get(t.tanggal) || {
      tanggal: t.tanggal,
      jumlah_transaksi: 0,
      omzet: 0,
      tunai: 0,
      qris: 0,
      piutang: 0,
    };
    existing.jumlah_transaksi += 1;
    existing.omzet += t.harga;
    if (t.metode_bayar === 'Tunai') existing.tunai += t.harga;
    if (t.metode_bayar === 'Qris') existing.qris += t.harga;
    if (t.metode_bayar === 'Piutang') existing.piutang += t.harga;
    map.set(t.tanggal, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

/**
 * Get Laporan Harian for a specific date range
 */
export async function getLaporanHarianRange(
  startDate: string,
  endDate: string
): Promise<LaporanHarian[]> {
  const all = await getLaporanHarian();
  return all
    .filter((l) => l.tanggal >= startDate && l.tanggal <= endDate)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

/**
 * SQL View: laporan_bulanan
 * select date_trunc('month', tanggal) as bulan, count(*) as jumlah_transaksi, sum(harga) as omzet
 * from transactions
 * where status = 'aktif'
 * group by date_trunc('month', tanggal);
 */
export async function getLaporanBulanan(year?: number): Promise<LaporanBulanan[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('laporan_bulanan')
        .select('*')
        .order('bulan', { ascending: false });
      if (!error && data) {
        let list = data as LaporanBulanan[];
        if (year) {
          list = list.filter((l) => l.bulan.startsWith(String(year)));
        }
        return list;
      }
    } catch (e) {
      console.warn('Supabase getLaporanBulanan view query failed, calculating locally:', e);
    }
  }

  const transactions = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const activeTrxs = transactions.filter((t) => t.status === 'aktif');

  const map = new Map<string, LaporanBulanan>();
  for (const t of activeTrxs) {
    const monthKey = t.tanggal.substring(0, 7) + '-01'; // YYYY-MM-01
    if (year && !t.tanggal.startsWith(String(year))) {
      continue;
    }
    const existing = map.get(monthKey) || {
      bulan: monthKey,
      jumlah_transaksi: 0,
      omzet: 0,
    };
    existing.jumlah_transaksi += 1;
    existing.omzet += t.harga;
    map.set(monthKey, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.bulan.localeCompare(a.bulan));
}

/**
 * SQL View: komisi_per_staff
 * select s.id, s.nama, s.role, t.tanggal, sum(ts.komisi) as total_komisi
 * from transaction_staff ts
 * join staff s on s.id = ts.staff_id
 * join transactions t on t.id = ts.transaction_id
 * where t.status = 'aktif'
 * group by s.id, s.nama, s.role, t.tanggal;
 */
export async function getKomisiPerStaff(filters?: {
  startDate?: string;
  endDate?: string;
  staffId?: number;
  role?: string;
}): Promise<KomisiPerStaff[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('komisi_per_staff').select('*');
      if (filters?.startDate) query = query.gte('tanggal', filters.startDate);
      if (filters?.endDate) query = query.lte('tanggal', filters.endDate);
      if (filters?.staffId) query = query.eq('id', filters.staffId);
      if (filters?.role) query = query.eq('role', filters.role);
      const { data, error } = await query;
      if (!error && data) return data as KomisiPerStaff[];
    } catch (e) {
      console.warn('Supabase getKomisiPerStaff view query failed, calculating locally:', e);
    }
  }

  const staffList = getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
  const transactions = getLocalData<Transaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  const staffTrxs = getLocalData<TransactionStaff>(
    STORAGE_KEYS.TRANSACTION_STAFF,
    initialTransactionStaff
  );

  const activeTrxMap = new Map<number, Transaction>();
  for (const t of transactions) {
    if (t.status === 'aktif') {
      activeTrxMap.set(t.id, t);
    }
  }

  const staffMap = new Map<number, Staff>();
  for (const s of staffList) {
    staffMap.set(s.id, s);
  }

  const groupMap = new Map<string, KomisiPerStaff>();

  for (const st of staffTrxs) {
    const trx = activeTrxMap.get(st.transaction_id);
    if (!trx) continue;

    if (filters?.startDate && trx.tanggal < filters.startDate) continue;
    if (filters?.endDate && trx.tanggal > filters.endDate) continue;

    const staffObj = staffMap.get(st.staff_id);
    if (!staffObj) continue;

    if (filters?.staffId && staffObj.id !== filters.staffId) continue;
    if (filters?.role && staffObj.role !== filters.role) continue;

    const groupKey = `${staffObj.id}_${trx.tanggal}`;
    const existing = groupMap.get(groupKey) || {
      id: staffObj.id,
      nama: staffObj.nama,
      role: staffObj.role,
      tanggal: trx.tanggal,
      total_komisi: 0,
    };

    existing.total_komisi += st.komisi;
    groupMap.set(groupKey, existing);
  }

  return Array.from(groupMap.values()).sort((a, b) => {
    const dateCmp = b.tanggal.localeCompare(a.tanggal);
    if (dateCmp !== 0) return dateCmp;
    return a.nama.localeCompare(b.nama);
  });
}

// -------------------------------------------------------------
// USERS (KELOLA USER - SISTEM_OWNER ONLY)
// -------------------------------------------------------------
export async function getUsersList(): Promise<User[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) return data as User[];
    } catch (e) {
      console.warn('Supabase getUsersList failed:', e);
    }
  }

  return getLocalData<User>(STORAGE_KEYS.USERS, initialUsers);
}

export async function addUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
  const payload = {
    ...user,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([payload])
        .select()
        .single();
      if (!error && data) return data as User;
    } catch (e) {
      console.warn('Supabase addUser failed:', e);
    }
  }

  const items = getLocalData<User>(STORAGE_KEYS.USERS, initialUsers);
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: User = { ...payload, id: nextId };
  items.push(newItem);
  setLocalData(STORAGE_KEYS.USERS, items);
  return newItem;
}

export async function updateUser(id: number, item: Partial<User>): Promise<User | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as User;
    } catch (e) {
      console.warn('Supabase updateUser failed:', e);
    }
  }

  const items = getLocalData<User>(STORAGE_KEYS.USERS, initialUsers);
  const index = items.findIndex((u) => u.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...item };
  setLocalData(STORAGE_KEYS.USERS, items);
  return items[index];
}

export async function resetPassword(id: number, newPasswordHash: string): Promise<boolean> {
  return (await updateUser(id, { password_hash: newPasswordHash })) !== null;
}

export async function deleteUser(id: number): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase deleteUser failed:', e);
    }
  }

  const items = getLocalData<User>(STORAGE_KEYS.USERS, initialUsers);
  const filtered = items.filter((u) => u.id !== id);
  setLocalData(STORAGE_KEYS.USERS, filtered);
  return true;
}

// -------------------------------------------------------------
// ATTENDANCE / ABSENSI (Tahap 5)
// -------------------------------------------------------------
export async function getAttendanceList(filters?: {
  tanggal?: string;
  startDate?: string;
  endDate?: string;
  staffId?: number;
}): Promise<Attendance[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('attendance').select('*, staff:staff_id(nama, role)');
      if (filters?.tanggal) query = query.eq('tanggal', filters.tanggal);
      if (filters?.startDate) query = query.gte('tanggal', filters.startDate);
      if (filters?.endDate) query = query.lte('tanggal', filters.endDate);
      if (filters?.staffId) query = query.eq('staff_id', filters.staffId);
      const { data, error } = await query.order('tanggal', { ascending: false });
      if (!error && data) {
        return (data as any[]).map((row) => ({
          id: row.id,
          staff_id: row.staff_id,
          tanggal: row.tanggal,
          status: row.status as AttendanceStatus,
          staff_nama: row.staff?.nama,
          staff_role: row.staff?.role,
        }));
      }
    } catch (e) {
      console.warn('Supabase getAttendanceList failed, using local storage:', e);
    }
  }

  const staffList = getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
  const staffMap = new Map<number, Staff>();
  for (const s of staffList) {
    staffMap.set(s.id, s);
  }

  let items = getLocalData<Attendance>(STORAGE_KEYS.ATTENDANCE, initialAttendance);

  if (filters?.tanggal) {
    items = items.filter((a) => a.tanggal === filters.tanggal);
  }
  if (filters?.startDate) {
    items = items.filter((a) => a.tanggal >= filters.startDate!);
  }
  if (filters?.endDate) {
    items = items.filter((a) => a.tanggal <= filters.endDate!);
  }
  if (filters?.staffId) {
    items = items.filter((a) => a.staff_id === filters.staffId);
  }

  return items.map((a) => {
    const st = staffMap.get(a.staff_id);
    return {
      ...a,
      staff_nama: a.staff_nama || st?.nama || `Staff #${a.staff_id}`,
      staff_role: a.staff_role || st?.role || 'washer',
    };
  });
}

export async function getAttendanceByDate(tanggal: string): Promise<Attendance[]> {
  return getAttendanceList({ tanggal });
}

export async function getMonthlyAttendance(yearMonth: string): Promise<Attendance[]> {
  // yearMonth format: 'YYYY-MM'
  const [yyyy, mm] = yearMonth.split('-').map(Number);
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return getAttendanceList({ startDate, endDate });
}

export async function saveBulkAttendance(
  tanggal: string,
  itemsToSave: { staff_id: number; status: AttendanceStatus }[]
): Promise<boolean> {
  const allStaff = getLocalData<Staff>(STORAGE_KEYS.STAFF, initialStaff);
  const staffMap = new Map<number, Staff>();
  for (const s of allStaff) {
    staffMap.set(s.id, s);
  }

  const existingAttendance = getLocalData<Attendance>(STORAGE_KEYS.ATTENDANCE, initialAttendance);
  let nextId = existingAttendance.length > 0 ? Math.max(...existingAttendance.map((a) => a.id)) + 1 : 1;

  for (const item of itemsToSave) {
    const existingIndex = existingAttendance.findIndex(
      (a) => a.staff_id === item.staff_id && a.tanggal === tanggal
    );

    const st = staffMap.get(item.staff_id);

    if (existingIndex !== -1) {
      existingAttendance[existingIndex] = {
        ...existingAttendance[existingIndex],
        status: item.status,
        staff_nama: st?.nama || existingAttendance[existingIndex].staff_nama,
        staff_role: st?.role || existingAttendance[existingIndex].staff_role,
      };
    } else {
      existingAttendance.push({
        id: nextId++,
        staff_id: item.staff_id,
        tanggal,
        status: item.status,
        staff_nama: st?.nama || `Staff #${item.staff_id}`,
        staff_role: st?.role || 'washer',
      });
    }
  }

  setLocalData(STORAGE_KEYS.ATTENDANCE, existingAttendance);

  if (isSupabaseConfigured && supabase) {
    try {
      const payload = itemsToSave.map((item) => ({
        staff_id: item.staff_id,
        tanggal,
        status: item.status,
      }));
      await supabase.from('attendance').upsert(payload, { onConflict: 'staff_id,tanggal' });
    } catch (e) {
      console.warn('Supabase saveBulkAttendance failed:', e);
    }
  }

  return true;
}

export async function saveSingleAttendance(
  staff_id: number,
  tanggal: string,
  status: AttendanceStatus
): Promise<boolean> {
  return saveBulkAttendance(tanggal, [{ staff_id, status }]);
}

// -------------------------------------------------------------
// INSENTIF MINGGUAN (Tahap 5)
// Gabungkan komisi_per_staff (Tahap 3) + komisi_manual (Tahap 2) + attendance
// -------------------------------------------------------------
export async function getWeeklyIncentives(
  startDate: string,
  endDate: string
): Promise<StaffWeeklyIncentive[]> {
  const [allStaff, transactions, staffTrxs, komisiManualList, attendanceList] = await Promise.all([
    getStaffList(),
    getTransactions({ status: 'aktif' }),
    getTransactionStaff(),
    getKomisiManual(),
    getAttendanceList({ startDate, endDate }),
  ]);

  // Active transactions map
  const activeTrxMap = new Map<number, Transaction>();
  for (const t of transactions) {
    if (t.status === 'aktif' && t.tanggal >= startDate && t.tanggal <= endDate) {
      activeTrxMap.set(t.id, t);
    }
  }

  // Calculate Komisi Cuci & Total Unit per staff
  const staffCuciMap = new Map<number, { komisi: number; units: number }>();
  for (const st of staffTrxs) {
    const trx = activeTrxMap.get(st.transaction_id);
    if (!trx) continue;

    const current = staffCuciMap.get(st.staff_id) || { komisi: 0, units: 0 };
    current.komisi += st.komisi;
    current.units += 1;
    staffCuciMap.set(st.staff_id, current);
  }

  // Calculate Komisi Manual per staff
  const staffManualMap = new Map<number, { nominal: number; items: KomisiManual[] }>();
  for (const km of komisiManualList) {
    if (km.tanggal >= startDate && km.tanggal <= endDate) {
      const current = staffManualMap.get(km.staff_id) || { nominal: 0, items: [] };
      current.nominal += km.nominal;
      current.items.push(km);
      staffManualMap.set(km.staff_id, current);
    }
  }

  // Calculate Hari Hadir from attendance per staff
  const staffHadirMap = new Map<number, number>();
  for (const att of attendanceList) {
    if (att.status === 'Hadir') {
      const count = staffHadirMap.get(att.staff_id) || 0;
      staffHadirMap.set(att.staff_id, count + 1);
    }
  }

  // Only include active staff (or inactive staff who worked in this period)
  const relevantStaff = allStaff.filter((s) => {
    if (s.aktif) return true;
    const cuci = staffCuciMap.get(s.id);
    const manual = staffManualMap.get(s.id);
    return (cuci && cuci.units > 0) || (manual && manual.nominal > 0);
  });

  const result: StaffWeeklyIncentive[] = relevantStaff.map((staff) => {
    const cuci = staffCuciMap.get(staff.id) || { komisi: 0, units: 0 };
    const manual = staffManualMap.get(staff.id) || { nominal: 0, items: [] };
    const hariHadir = staffHadirMap.get(staff.id) || 0;
    const totalInsentif = cuci.komisi + manual.nominal;

    return {
      staff_id: staff.id,
      nama: staff.nama,
      role: staff.role,
      multiplier: staff.latest_multiplier ?? 0,
      hari_hadir: hariHadir,
      total_unit_cuci: cuci.units,
      komisi_cuci: cuci.komisi,
      komisi_manual: manual.nominal,
      rincian_manual: manual.items,
      total_insentif: totalInsentif,
    };
  });

  // Sort: role priority (leader, checker, washer) then highest incentive
  const roleWeight: Record<string, number> = { leader: 1, checker: 2, washer: 3 };
  return result.sort((a, b) => {
    const wA = roleWeight[a.role] || 4;
    const wB = roleWeight[b.role] || 4;
    if (wA !== wB) return wA - wB;
    return b.total_insentif - a.total_insentif;
  });
}

export const SUPABASE_MIGRATION_SQL = `-- =============================================================
-- Migration SQL & Views untuk Supabase (BSA Car Wash)
-- =============================================================

create table if not exists vehicle_categories (
  id serial primary key,
  kendaraan text not null,
  merk text,
  model text,
  tipe text not null,
  kategori int
);

create table if not exists price_list (
  id serial primary key,
  kendaraan text not null,
  paket text not null,
  fasilitas text not null,
  tipe text not null,
  harga numeric not null,
  komisi_washer numeric default 0,
  komisi_checker numeric default 0,
  unique (kendaraan, paket, fasilitas, tipe)
);

create table if not exists staff (
  id serial primary key,
  nama text not null,
  role text not null check (role in ('washer','checker','leader')),
  aktif boolean default true
);

create table if not exists staff_komisi_multiplier (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  multiplier numeric not null,
  berlaku_mulai date not null,
  dientry_oleh int references staff(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists attendance (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  tanggal date not null,
  status text not null check (status in ('Hadir','Izin','Sakit','Alpha')),
  unique (staff_id, tanggal)
);

create table if not exists customers (
  id serial primary key,
  nopol text unique not null,
  nama text,
  hp text,
  kendaraan text,
  tier text default 'reguler',
  created_at timestamptz default now()
);

create table if not exists nopol_history (
  id serial primary key,
  customer_id int references customers(id) on delete cascade,
  nopol_lama text not null,
  nopol_baru text not null,
  intensitas_saat_pindah int not null,  -- snapshot total kunjungan aktif pas plat diganti
  diubah_oleh int references users(id) on delete set null,
  tanggal_ubah timestamptz default now()
);

create table if not exists transactions (
  id serial primary key,
  no_transaksi text unique not null,
  tanggal date not null,
  customer_id int references customers(id) on delete set null,
  no_polisi text not null,
  kendaraan text not null,
  tipe text not null,
  paket_nama text not null,
  harga numeric not null,
  komisi_washer numeric default 0,
  komisi_checker numeric default 0,
  metode_bayar text not null check (metode_bayar in ('Tunai', 'Qris', 'Piutang')),
  status_piutang text check (status_piutang in ('belum_lunas', 'lunas')),
  tanggal_lunas timestamptz,
  status text not null default 'aktif' check (status in ('aktif', 'void')),
  created_by text,
  created_at timestamptz default now()
);

create table if not exists transaction_staff (
  id serial primary key,
  transaction_id int references transactions(id) on delete cascade,
  staff_id int references staff(id) on delete cascade,
  komisi numeric not null default 0
);

create table if not exists komisi_manual (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  tanggal date not null,
  keterangan text not null,
  nominal numeric not null,
  dientry_oleh int references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  nama text not null,
  role text not null check (role in ('admin','spv','owner','sistem_owner')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- =============================================================
-- SQL VIEWS (Tahap 3)
-- =============================================================

create or replace view laporan_harian as
select tanggal, count(*) as jumlah_transaksi, sum(harga) as omzet,
       sum(case when metode_bayar = 'Tunai' then harga else 0 end) as tunai,
       sum(case when metode_bayar = 'Qris' then harga else 0 end) as qris,
       sum(case when metode_bayar = 'Piutang' then harga else 0 end) as piutang
from transactions
where status = 'aktif'
group by tanggal;

create or replace view laporan_bulanan as
select date_trunc('month', tanggal) as bulan, count(*) as jumlah_transaksi, sum(harga) as omzet
from transactions
where status = 'aktif'
group by date_trunc('month', tanggal);

create or replace view komisi_per_staff as
select s.id, s.nama, s.role, t.tanggal, sum(ts.komisi) as total_komisi
from transaction_staff ts
join staff s on s.id = ts.staff_id
join transactions t on t.id = ts.transaction_id
where t.status = 'aktif'
group by s.id, s.nama, s.role, t.tanggal;
`;

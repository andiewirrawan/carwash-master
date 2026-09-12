import { supabase, isSupabaseConfigured } from './supabase';
import {
  VehicleCategory,
  PriceList,
  Staff,
  StaffKomisiMultiplier,
  User,
} from '@/types/database';
import {
  initialVehicleCategories,
  initialPriceList,
  initialStaff,
  initialStaffMultipliers,
  initialUsers,
} from './seedData';

// Local storage keys
const STORAGE_KEYS = {
  VEHICLES: 'bsa_carwash_vehicles',
  PRICE_LIST: 'bsa_carwash_price_list',
  STAFF: 'bsa_carwash_staff',
  STAFF_MULTIPLIERS: 'bsa_carwash_staff_multipliers',
  USERS: 'bsa_carwash_users',
};

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
      if (!error && data) return data as PriceList[];
    } catch (e) {
      console.warn('Supabase getPriceList failed, using fallback:', e);
    }
  }
  return getLocalData<PriceList>(STORAGE_KEYS.PRICE_LIST, initialPriceList);
}

export async function addPriceList(item: Omit<PriceList, 'id'>): Promise<PriceList> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .insert([item])
        .select()
        .single();
      if (!error && data) return data as PriceList;
    } catch (e) {
      console.warn('Supabase insert price_list failed:', e);
    }
  }

  const items = getLocalData<PriceList>(STORAGE_KEYS.PRICE_LIST, initialPriceList);
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem: PriceList = { ...item, id: nextId };
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
      if (!error && data) return data as StaffKomisiMultiplier[];
    } catch (e) {
      console.warn('Supabase getStaffMultipliers failed:', e);
    }
  }

  const all = getLocalData<StaffKomisiMultiplier>(
    STORAGE_KEYS.STAFF_MULTIPLIERS,
    initialStaffMultipliers
  );

  const filtered = staffId ? all.filter((m) => m.staff_id === staffId) : all;
  return filtered.sort(
    (a, b) => new Date(b.berlaku_mulai).getTime() - new Date(a.berlaku_mulai).getTime()
  );
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

/**
 * Gets effective multiplier for a staff member at a given target date (YYYY-MM-DD)
 * Finds row with berlaku_mulai <= targetDate, sorted by berlaku_mulai DESC, taking the top one.
 */
export async function getEffectiveMultiplierForDate(
  staffId: number,
  targetDateStr: string
): Promise<number> {
  const multipliers = await getStaffMultipliers(staffId);
  const targetTime = new Date(targetDateStr).getTime();

  const validRows = multipliers.filter(
    (m) => new Date(m.berlaku_mulai).getTime() <= targetTime
  );

  if (validRows.length === 0) return 0;
  return validRows[0].multiplier;
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

export const SUPABASE_MIGRATION_SQL = `-- Migration SQL untuk Supabase (BSA Car Wash)

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

create table if not exists users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  nama text not null,
  role text not null check (role in ('admin','spv','owner','sistem_owner')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- Seed Data Awal
insert into users (username, password_hash, nama, role, aktif)
values
  ('wiro', 'wiro123', 'Wiro (Sistem Owner)', 'sistem_owner', true),
  ('owner', 'owner123', 'Pak BSA (Owner)', 'owner', true),
  ('spv', 'spv123', 'Siti SPV Keuangan', 'spv', true),
  ('kasir', 'kasir123', 'Kasir Admin 1', 'admin', true)
on conflict (username) do nothing;
`;

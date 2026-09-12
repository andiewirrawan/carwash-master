export type Role = 'admin' | 'spv' | 'owner' | 'sistem_owner';
export type StaffRole = 'washer' | 'checker' | 'leader';

export interface VehicleCategory {
  id: number;
  kendaraan: string; // e.g., 'Mobil', 'Motor'
  merk: string | null; // e.g., 'Toyota', 'Honda'
  model: string | null; // e.g., 'Avanza', 'Vario'
  tipe: string; // e.g., 'Small', 'Medium', 'Large', 'Luxury'
  kategori: number | null; // Numeric category code
}

export interface PriceList {
  id: number;
  kendaraan: string; // e.g., 'Mobil', 'Motor'
  paket: string; // e.g., 'Cuci Body', 'Cuci Salju + Wax'
  fasilitas: string; // e.g., 'Shampoo, Vacuum, Semir Ban'
  tipe: string; // e.g., 'Small', 'Medium', 'Large'
  harga: number; // Stored as numeric
  komisi_washer: number;
  komisi_checker: number;
}

export interface Staff {
  id: number;
  nama: string;
  role: StaffRole;
  aktif: boolean;
  latest_multiplier?: number;
}

export interface StaffKomisiMultiplier {
  id: number;
  staff_id: number;
  multiplier: number; // Percent addition, e.g. 10 = +10%
  berlaku_mulai: string; // YYYY-MM-DD
  dientry_oleh: number | null; // staff_id or user_id
  dientry_oleh_nama?: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  nama: string;
  role: Role;
  aktif: boolean;
  created_at: string;
}

export interface SessionUser {
  id: number;
  username: string;
  nama: string;
  role: Role;
}

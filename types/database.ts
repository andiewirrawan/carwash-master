export type Role = 'admin' | 'spv' | 'owner' | 'sistem_owner';
export type StaffRole = 'washer' | 'checker' | 'leader' | string;

export interface VehicleCategory {
  id: number;
  kendaraan: string; // e.g., 'Mobil', 'Motor'
  merk: string | null; // e.g., 'Toyota', 'Honda'
  model: string | null; // e.g., 'Avanza', 'Vario'
  tipe: string; // e.g., 'Small', 'Medium', 'Large', 'Luxury'
  keterangan: string | null;
  kategori?: number | null; // optional backwards compat
}

export interface PriceListKomisi {
  id: number;
  price_list_id: number;
  peran: string; // e.g., 'washer', 'checker', 'kasir', 'leader', 'marketing', dll
  komisi: number;
}

export interface PriceList {
  id: number;
  kendaraan: string; // e.g., 'Mobil', 'Motor'
  paket_nama?: string; // alias helper
  paket: string; // e.g., 'Cuci Body', 'Cuci Salju + Wax'
  fasilitas: string; // e.g., 'Shampoo, Vacuum, Semir Ban'
  tipe: string; // e.g., 'Small', 'Medium', 'Large'
  harga: number; // Stored as numeric
  komisi_washer?: number; // helper from komisi_list
  komisi_checker?: number; // helper from komisi_list
  komisi_list?: PriceListKomisi[];
}

export interface Customer {
  id: number;
  nopol: string;
  nama?: string | null;
  hp?: string | null;
  kendaraan?: string | null;
  tier?: string; // 'reguler' | 'gold'
  created_at?: string;
  total_kunjungan?: number; // calculated/snapshot
  total_omzet?: number; // calculated/snapshot
}

export interface NopolHistory {
  id: number;
  customer_id: number;
  nopol_lama: string;
  nopol_baru: string;
  intensitas_saat_pindah: number;
  diubah_oleh: number | null;
  diubah_oleh_nama?: string;
  tanggal_ubah: string;
}

export interface Staff {
  id: number;
  nama: string;
  role: StaffRole | string;
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
  tanggal?: string;
}

export type StaffMultiplier = StaffKomisiMultiplier;

export interface Transaction {
  id: number;
  tanggal: string; // YYYY-MM-DD
  waktu?: string; // HH:MM:SS
  customer_id?: number | null;
  price_list_id?: number | null;
  harga: number; // Snapshot harga saat transaksi terjadi
  harga_standar?: number;
  harga_disesuaikan?: boolean;
  metode_bayar: 'Tunai' | 'Qris' | 'Promo' | 'Piutang' | string;
  status_piutang?: 'belum_lunas' | 'lunas' | null;
  tanggal_lunas?: string | null;
  keterangan?: string | null;
  kasir_id?: number | null;
  status: 'aktif' | 'void' | 'batal';
  created_at?: string;
  // Helpers for UI display
  no_transaksi?: string;
  no_polisi?: string;
  customer_nama?: string;
  customer_hp?: string;
  kendaraan?: string;
  tipe?: string;
  paket_nama?: string;
  created_by?: string;
  created_by_nama?: string;
  komisi_washer?: number;
  komisi_checker?: number;
}

export interface TransactionStaff {
  transaction_id: number;
  staff_id: number;
  peran?: string; // 'washer', 'checker', etc.
  komisi: number;
  // Helpers
  id?: number;
  staff_nama?: string;
  role?: string;
  multiplier?: number;
}

export interface TransactionVoidLog {
  id: number;
  transaction_id: number;
  alasan: string;
  di_void_oleh: number | null;
  di_void_oleh_nama?: string;
  tanggal_void: string;
}

export interface KomisiManual {
  id: number;
  staff_id: number;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  nominal: number;
  dientry_oleh: number | null;
  dientry_oleh_nama?: string;
  staff_nama?: string;
  created_at: string;
}

// SQL Views & Reports
export interface LaporanHarian {
  tanggal: string;
  jumlah_transaksi: number;
  omzet: number;
  tunai: number;
  qris: number;
  piutang: number;
}

export interface LaporanBulanan {
  bulan: string; // YYYY-MM-01
  jumlah_transaksi: number;
  omzet: number;
}

export interface KomisiPerStaff {
  id: number;
  nama: string;
  role: string;
  tanggal: string;
  total_komisi: number;
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

// Attendance (Tahap 5)
export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';

export interface Attendance {
  id: number;
  staff_id: number;
  tanggal: string; // YYYY-MM-DD
  status: AttendanceStatus;
  staff_nama?: string;
  staff_role?: string;
}

// Weekly Incentive Breakdown (Tahap 5)
export interface StaffWeeklyIncentive {
  staff_id: number;
  nama: string;
  role: string;
  multiplier: number;
  hari_hadir: number;
  total_unit_cuci: number;
  komisi_cuci: number;
  komisi_manual: number;
  rincian_manual: KomisiManual[];
  total_insentif: number;
}

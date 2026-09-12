import { VehicleCategory, PriceList, Staff, StaffKomisiMultiplier, User } from '@/types/database';

export const initialVehicleCategories: VehicleCategory[] = [
  { id: 1, kendaraan: 'Mobil', merk: 'Toyota', model: 'Avanza / Xenia / Ertiga', tipe: 'Medium', kategori: 1 },
  { id: 2, kendaraan: 'Mobil', merk: 'Toyota', model: 'Fortuner / Pajero / Alphard', tipe: 'Large', kategori: 2 },
  { id: 3, kendaraan: 'Mobil', merk: 'Honda', model: 'Brio / Yaris / Jazz', tipe: 'Small', kategori: 1 },
  { id: 4, kendaraan: 'Motor', merk: 'Honda', model: 'Beat / Vario / Mio', tipe: 'Small', kategori: 3 },
  { id: 5, kendaraan: 'Motor', merk: 'Yamaha', model: 'NMAX / PCX / Aerox', tipe: 'Medium', kategori: 3 },
  { id: 6, kendaraan: 'Motor', merk: 'Kawasaki', model: 'ZX25R / Ninja 250', tipe: 'Large', kategori: 4 },
];

export const initialPriceList: PriceList[] = [
  {
    id: 1,
    kendaraan: 'Mobil',
    paket: 'Cuci Body + Semir',
    fasilitas: 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber',
    tipe: 'Small',
    harga: 40000,
    komisi_washer: 8000,
    komisi_checker: 4000,
  },
  {
    id: 2,
    kendaraan: 'Mobil',
    paket: 'Cuci Body + Semir',
    fasilitas: 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber',
    tipe: 'Medium',
    harga: 50000,
    komisi_washer: 10000,
    komisi_checker: 5000,
  },
  {
    id: 3,
    kendaraan: 'Mobil',
    paket: 'Cuci Body + Semir',
    fasilitas: 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber',
    tipe: 'Large',
    harga: 65000,
    komisi_washer: 13000,
    komisi_checker: 6000,
  },
  {
    id: 4,
    kendaraan: 'Mobil',
    paket: 'Cuci Salju + Wax Coating',
    fasilitas: 'Cuci Kolong, Snow Wash, Premium Wax, Interior Clean, Semir Premium',
    tipe: 'Medium',
    harga: 120000,
    komisi_washer: 25000,
    komisi_checker: 12000,
  },
  {
    id: 5,
    kendaraan: 'Motor',
    paket: 'Cuci Regular',
    fasilitas: 'Shampoo Snow, Semir Ban, Pengeringan',
    tipe: 'Small',
    harga: 15000,
    komisi_washer: 3000,
    komisi_checker: 1500,
  },
  {
    id: 6,
    kendaraan: 'Motor',
    paket: 'Cuci Regular + Detail',
    fasilitas: 'Shampoo Snow, Semir Ban, Detail Mesin, Polish Bodi',
    tipe: 'Medium',
    harga: 30000,
    komisi_washer: 6000,
    komisi_checker: 3000,
  },
];

export const initialStaff: Staff[] = [
  { id: 1, nama: 'Topa', role: 'washer', aktif: true },
  { id: 2, nama: 'Budi Santoso', role: 'washer', aktif: true },
  { id: 3, nama: 'Agus Prayitno', role: 'checker', aktif: true },
  { id: 4, nama: 'Rudi Hermawan', role: 'leader', aktif: true },
  { id: 5, nama: 'Dedi Kurniawan', role: 'washer', aktif: false },
];

export const initialStaffMultipliers: StaffKomisiMultiplier[] = [
  {
    id: 1,
    staff_id: 1, // Topa
    multiplier: 0,
    berlaku_mulai: '2025-01-01',
    dientry_oleh: 1,
    dientry_oleh_nama: 'Wiro (sistem_owner)',
    created_at: '2025-01-01T08:00:00Z',
  },
  {
    id: 2,
    staff_id: 1, // Topa
    multiplier: 10, // +10% berlaku mulai 01/12/2026
    berlaku_mulai: '2026-12-01',
    dientry_oleh: 1,
    dientry_oleh_nama: 'Wiro (sistem_owner)',
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 3,
    staff_id: 2, // Budi Santoso
    multiplier: 5,
    berlaku_mulai: '2026-01-01',
    dientry_oleh: 1,
    dientry_oleh_nama: 'Wiro (sistem_owner)',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 4,
    staff_id: 3, // Agus Prayitno
    multiplier: 0,
    berlaku_mulai: '2025-06-01',
    dientry_oleh: 1,
    dientry_oleh_nama: 'Wiro (sistem_owner)',
    created_at: '2025-06-01T08:00:00Z',
  },
];

export const initialUsers: User[] = [
  {
    id: 1,
    username: 'wiro',
    password_hash: 'wiro123',
    nama: 'Wiro (Sistem Owner)',
    role: 'sistem_owner',
    aktif: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'owner',
    password_hash: 'owner123',
    nama: 'Pak BSA (Owner)',
    role: 'owner',
    aktif: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    username: 'spv',
    password_hash: 'spv123',
    nama: 'Siti SPV Keuangan',
    role: 'spv',
    aktif: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4,
    username: 'kasir',
    password_hash: 'kasir123',
    nama: 'Kasir Admin 1',
    role: 'admin',
    aktif: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

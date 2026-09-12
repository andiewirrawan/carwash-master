import {
  VehicleCategory,
  PriceList,
  Staff,
  StaffKomisiMultiplier,
  User,
  Transaction,
  TransactionStaff,
  Attendance,
} from '@/types/database';

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

// Seed generator for realistic past 30 days transactions (2026-08-14 to 2026-09-12)
function generateSeedTransactions(): { transactions: Transaction[]; transactionStaff: TransactionStaff[] } {
  const transactions: Transaction[] = [];
  const transactionStaff: TransactionStaff[] = [];
  let trxId = 1;
  let staffTrxId = 1;

  const sampleCars = [
    { nopol: 'B 1234 BSA', kend: 'Mobil', tipe: 'Medium', paketId: 2, paket: 'Cuci Body + Semir', harga: 50000, wKomisi: 10000, cKomisi: 5000 },
    { nopol: 'B 8888 RIT', kend: 'Mobil', tipe: 'Large', paketId: 3, paket: 'Cuci Body + Semir', harga: 65000, wKomisi: 13000, cKomisi: 6000 },
    { nopol: 'D 1902 AC', kend: 'Mobil', tipe: 'Medium', paketId: 4, paket: 'Cuci Salju + Wax Coating', harga: 120000, wKomisi: 25000, cKomisi: 12000 },
    { nopol: 'B 4567 XYZ', kend: 'Mobil', tipe: 'Small', paketId: 1, paket: 'Cuci Body + Semir', harga: 40000, wKomisi: 8000, cKomisi: 4000 },
    { nopol: 'B 3321 MOT', kend: 'Motor', tipe: 'Small', paketId: 5, paket: 'Cuci Regular', harga: 15000, wKomisi: 3000, cKomisi: 1500 },
    { nopol: 'B 6789 NMX', kend: 'Motor', tipe: 'Medium', paketId: 6, paket: 'Cuci Regular + Detail', harga: 30000, wKomisi: 6000, cKomisi: 3000 },
  ];

  const washers = [
    { id: 1, nama: 'Topa', multiplier: 0 },
    { id: 2, nama: 'Budi Santoso', multiplier: 5 },
  ];
  const checker = { id: 3, nama: 'Agus Prayitno', multiplier: 0 };

  // Generate for 30 days back from 2026-09-12
  const endDate = new Date(2026, 8, 12); // Sept 12 2026

  for (let i = 29; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Number of transactions per day (between 6 and 14)
    const daySeed = (d.getDate() * 3 + d.getDay() * 7) % 7;
    const trxCount = 7 + daySeed;

    for (let t = 0; t < trxCount; t++) {
      const carIndex = (t + daySeed) % sampleCars.length;
      const car = sampleCars[carIndex];
      const methodChoice = (t + daySeed) % 10;
      const metode_bayar: 'Tunai' | 'Qris' | 'Piutang' =
        methodChoice < 6 ? 'Tunai' : methodChoice < 9 ? 'Qris' : 'Piutang';

      const no_transaksi = `TRX-${yyyy}${mm}${dd}-${String(t + 1).padStart(3, '0')}`;
      const washer = washers[t % washers.length];

      // Calculate washer commission with multiplier
      const calculatedWasherKomisi = Math.round(car.wKomisi * (1 + washer.multiplier / 100));

      const trx: Transaction = {
        id: trxId,
        no_transaksi,
        tanggal: dateStr,
        no_polisi: `${car.nopol.split(' ')[0]} ${parseInt(car.nopol.split(' ')[1], 10) + t} ${car.nopol.split(' ')[2]}`,
        kendaraan: car.kend,
        tipe: car.tipe,
        paket_nama: car.paket,
        harga: car.harga,
        metode_bayar,
        status: 'aktif',
        created_by: 'Kasir Admin 1',
        created_by_nama: 'Kasir Admin 1',
        created_at: `${dateStr}T${String(8 + (t % 10)).padStart(2, '0')}:${String((t * 12) % 60).padStart(2, '0')}:00Z`,
      };
      transactions.push(trx);

      // Assigned Washer
      transactionStaff.push({
        id: staffTrxId++,
        transaction_id: trxId,
        staff_id: washer.id,
        staff_nama: washer.nama,
        role: 'washer',
        komisi: calculatedWasherKomisi,
        multiplier: washer.multiplier,
      });

      // Assigned Checker (for cars)
      if (car.kend === 'Mobil') {
        transactionStaff.push({
          id: staffTrxId++,
          transaction_id: trxId,
          staff_id: checker.id,
          staff_nama: checker.nama,
          role: 'checker',
          komisi: car.cKomisi,
          multiplier: 0,
        });
      }

      trxId++;
    }
  }

  return { transactions, transactionStaff };
}

const seedDataGenerated = generateSeedTransactions();
export const initialTransactions: Transaction[] = seedDataGenerated.transactions;
export const initialTransactionStaff: TransactionStaff[] = seedDataGenerated.transactionStaff;

// Seed generator for Attendance (from 2026-08-01 to 2026-09-12)
function generateSeedAttendance(): Attendance[] {
  const attendanceList: Attendance[] = [];
  let id = 1;

  // Active staff
  const staffMembers = [
    { id: 1, nama: 'Topa', role: 'washer' },
    { id: 2, nama: 'Budi Santoso', role: 'washer' },
    { id: 3, nama: 'Agus Prayitno', role: 'checker' },
    { id: 4, nama: 'Rudi Hermawan', role: 'leader' },
  ];

  // Specific absence overrides (for realistic patterns)
  const exceptions: Record<string, Record<number, 'Izin' | 'Sakit' | 'Alpha'>> = {
    '2026-08-05': { 2: 'Izin' },
    '2026-08-11': { 1: 'Sakit' },
    '2026-08-18': { 3: 'Izin' },
    '2026-08-22': { 1: 'Alpha' },
    '2026-08-27': { 4: 'Izin' },
    '2026-09-02': { 3: 'Alpha' },
    '2026-09-04': { 1: 'Izin' },
    '2026-09-08': { 2: 'Sakit' },
    '2026-09-11': { 3: 'Izin' },
  };

  // Generate for August 1 to September 12, 2026
  const startDate = new Date(2026, 7, 1); // 2026-08-01
  const endDate = new Date(2026, 8, 12); // 2026-09-12

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    for (const staff of staffMembers) {
      let status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha' = 'Hadir';

      if (exceptions[dateStr] && exceptions[dateStr][staff.id]) {
        status = exceptions[dateStr][staff.id];
      }

      attendanceList.push({
        id: id++,
        staff_id: staff.id,
        tanggal: dateStr,
        status,
        staff_nama: staff.nama,
        staff_role: staff.role,
      });
    }
  }

  return attendanceList;
}

export const initialAttendance: Attendance[] = generateSeedAttendance();

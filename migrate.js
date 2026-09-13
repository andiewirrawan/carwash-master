const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Migrating users...');
  const users = [
    { username: 'wiro', password_hash: 'wiro123', nama: 'Wiro (Sistem Owner)', role: 'sistem_owner', aktif: true },
    { username: 'owner', password_hash: 'owner123', nama: 'Pak BSA (Owner)', role: 'owner', aktif: true },
    { username: 'spv', password_hash: 'spv123', nama: 'Siti SPV Keuangan', role: 'spv', aktif: true },
    { username: 'kasir', password_hash: 'kasir123', nama: 'Kasir Admin 1', role: 'admin', aktif: true }
  ];
  const { data: usersRes, error: errUser } = await supabase.from('users').upsert(users, { onConflict: 'username' }).select();
  if (errUser) console.error('User migration error:', errUser);
  else console.log('Users migrated:', usersRes?.length);

  console.log('Migrating vehicle_categories...');
  const vehicles = [
    { kendaraan: 'Mobil', merk: 'Toyota', model: 'Avanza / Xenia / Ertiga', tipe: 'Medium', kategori: 2 },
    { kendaraan: 'Mobil', merk: 'Toyota', model: 'Fortuner / Pajero / Alphard', tipe: 'Large', kategori: 3 },
    { kendaraan: 'Mobil', merk: 'Honda', model: 'Brio / Yaris / Jazz', tipe: 'Small', kategori: 1 },
    { kendaraan: 'Motor', merk: 'Honda', model: 'Beat / Vario / Mio', tipe: 'Small', kategori: 1 },
    { kendaraan: 'Motor', merk: 'Yamaha', model: 'NMAX / PCX / Aerox', tipe: 'Medium', kategori: 2 },
    { kendaraan: 'Motor', merk: 'Kawasaki', model: 'ZX25R / Ninja 250', tipe: 'Large', kategori: 3 }
  ];
  
  // First clear existing if we want or just insert
  for (const v of vehicles) {
    const { error } = await supabase.from('vehicle_categories').insert([v]);
    if (error && error.code !== '23505') console.log('Insert err:', error.message);
  }
  console.log('Vehicles done.');

  console.log('Migrating staff...');
  const staffs = [
    { nama: 'Topa', role: 'washer', aktif: true },
    { nama: 'Budi Santoso', role: 'washer', aktif: true },
    { nama: 'Agus Prayitno', role: 'checker', aktif: true },
    { nama: 'Rudi Hermawan', role: 'leader', aktif: true },
    { nama: 'Dedi Kurniawan', role: 'washer', aktif: false }
  ];
  
  for (const s of staffs) {
    const { error } = await supabase.from('staff').insert([s]);
  }
  console.log('Staff done.');

  console.log('Migrating price list...');
  const prices = [
    { kendaraan: 'Mobil', paket: 'Cuci Body + Semir', fasilitas: 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber', tipe: 'Small', harga: 40000 },
    { kendaraan: 'Mobil', paket: 'Cuci Body + Semir', fasilitas: 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber', tipe: 'Medium', harga: 50000 },
    { kendaraan: 'Mobil', paket: 'Cuci Body + Semir', fasilitas: 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber', tipe: 'Large', harga: 65000 },
    { kendaraan: 'Mobil', paket: 'Cuci Salju + Wax Coating', fasilitas: 'Cuci Kolong, Snow Wash, Premium Wax, Interior Clean, Semir Premium', tipe: 'Medium', harga: 120000 },
    { kendaraan: 'Motor', paket: 'Cuci Regular', fasilitas: 'Shampoo Snow, Semir Ban, Pengeringan', tipe: 'Small', harga: 15000 },
    { kendaraan: 'Motor', paket: 'Cuci Regular + Detail', fasilitas: 'Shampoo Snow, Semir Ban, Detail Mesin, Polish Bodi', tipe: 'Medium', harga: 30000 }
  ];
  for (const p of prices) {
    await supabase.from('price_list').insert([p]);
  }
  console.log('Price list done.');

  console.log('Migrating price list komisi (fetch first)...');
  const { data: dbPrices } = await supabase.from('price_list').select('*');
  if (dbPrices) {
    for (const p of dbPrices) {
      let komisiW = 0, komisiC = 0;
      if (p.paket === 'Cuci Body + Semir' && p.tipe === 'Small') { komisiW = 8000; komisiC = 4000; }
      else if (p.paket === 'Cuci Body + Semir' && p.tipe === 'Medium') { komisiW = 10000; komisiC = 5000; }
      else if (p.paket === 'Cuci Body + Semir' && p.tipe === 'Large') { komisiW = 13000; komisiC = 6000; }
      else if (p.paket === 'Cuci Salju + Wax Coating' && p.tipe === 'Medium') { komisiW = 25000; komisiC = 12000; }
      else if (p.paket === 'Cuci Regular' && p.tipe === 'Small') { komisiW = 3000; komisiC = 1500; }
      else if (p.paket === 'Cuci Regular + Detail' && p.tipe === 'Medium') { komisiW = 6000; komisiC = 3000; }

      if (komisiW > 0) {
        await supabase.from('price_list_komisi').insert({ price_list_id: p.id, peran: 'washer', komisi: komisiW });
      }
      if (komisiC > 0) {
        await supabase.from('price_list_komisi').insert({ price_list_id: p.id, peran: 'checker', komisi: komisiC });
      }
    }
  }

  console.log('Migrating multiplier...');
  const { data: dbStaff } = await supabase.from('staff').select('*');
  const { data: wiroUser } = await supabase.from('users').select('*').eq('username', 'wiro').single();
  
  if (wiroUser && dbStaff) {
    for (const s of dbStaff) {
      if (s.nama === 'Topa') {
        await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 0, berlaku_mulai: '2025-01-01', dientry_oleh: wiroUser.id });
        await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 10, berlaku_mulai: '2026-12-01', dientry_oleh: wiroUser.id });
      } else if (s.nama === 'Budi Santoso') {
        await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 5, berlaku_mulai: '2026-01-01', dientry_oleh: wiroUser.id });
      } else if (s.nama === 'Agus Prayitno') {
        await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 0, berlaku_mulai: '2025-06-01', dientry_oleh: wiroUser.id });
      }
    }
  }

  console.log('Migration completed successfully!');
}

migrate();

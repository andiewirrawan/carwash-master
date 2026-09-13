const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rcwtfkwksyzssppnnsdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjd3Rma3drc3l6c3NwcG5uc2RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI0OTk3OSwiZXhwIjoyMTA0ODI1OTc5fQ.CJ_h2KA7aum2ZhlhYImGPZFEKoOyeh1qefIDKYWYtsc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  try {
    console.log('Migrating users...');
    const users = [
      { username: 'wiro', password_hash: 'wiro123', nama: 'Wiro (Sistem Owner)', role: 'sistem_owner', aktif: true },
      { username: 'owner', password_hash: 'owner123', nama: 'Pak BSA (Owner)', role: 'owner', aktif: true },
      { username: 'spv', password_hash: 'spv123', nama: 'Siti SPV Keuangan', role: 'spv', aktif: true },
      { username: 'kasir', password_hash: 'kasir123', nama: 'Kasir Admin 1', role: 'admin', aktif: true }
    ];
    for (const u of users) {
      const { error } = await supabase.from('users').upsert([u], { onConflict: 'username' });
      if (error && error.code !== '23505') console.log('User err:', error.message);
    }
    console.log('Users done.');

    console.log('Migrating vehicle_categories...');
    const vehicles = [
      { kendaraan: 'Mobil', merk: 'Toyota', model: 'Avanza / Xenia / Ertiga', tipe: 'Medium', keterangan: 'MPV Kompak Standard' },
      { kendaraan: 'Mobil', merk: 'Toyota', model: 'Fortuner / Pajero / Alphard', tipe: 'Large', keterangan: 'SUV & Premium Van' },
      { kendaraan: 'Mobil', merk: 'Honda', model: 'Brio / Yaris / Jazz', tipe: 'Small', keterangan: 'City Car & Hatchback' },
      { kendaraan: 'Motor', merk: 'Honda', model: 'Beat / Vario / Mio', tipe: 'Small', keterangan: 'Matic Kompak < 125cc' },
      { kendaraan: 'Motor', merk: 'Yamaha', model: 'NMAX / PCX / Aerox', tipe: 'Medium', keterangan: 'Matic Maxi 150-160cc' },
      { kendaraan: 'Motor', merk: 'Kawasaki', model: 'ZX25R / Ninja 250', tipe: 'Large', keterangan: 'Sport & Big Bike > 250cc' }
    ];
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
      if (error && error.code !== '23505') console.log('Staff err:', error.message);
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
      const { error } = await supabase.from('price_list').insert([p]);
      if (error && error.code !== '23505') console.log('Price list err:', error.message);
    }
    console.log('Price list done.');

    console.log('Migrating price list komisi...');
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
          const { error } = await supabase.from('price_list_komisi').insert({ price_list_id: p.id, peran: 'washer', komisi: komisiW });
          if (error && error.code !== '23505') console.log('Komisi err:', error.message);
        }
        if (komisiC > 0) {
          const { error } = await supabase.from('price_list_komisi').insert({ price_list_id: p.id, peran: 'checker', komisi: komisiC });
          if (error && error.code !== '23505') console.log('Komisi err:', error.message);
        }
      }
    }
    console.log('Price list komisi done.');

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
    console.log('Multiplier done.');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Unhandled error:', err);
  }
}

migrate();

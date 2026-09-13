const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rcwtfkwksyzssppnnsdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjd3Rma3drc3l6c3NwcG5uc2RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI0OTk3OSwiZXhwIjoyMTA0ODI1OTc5fQ.CJ_h2KA7aum2ZhlhYImGPZFEKoOyeh1qefIDKYWYtsc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Migrating vehicle_categories...');
  const vehicles = [
    { kendaraan: 'Mobil', merk: 'Toyota', model: 'Avanza / Xenia / Ertiga', tipe: 'Medium' },
    { kendaraan: 'Mobil', merk: 'Toyota', model: 'Fortuner / Pajero / Alphard', tipe: 'Large' },
    { kendaraan: 'Mobil', merk: 'Honda', model: 'Brio / Yaris / Jazz', tipe: 'Small' },
    { kendaraan: 'Motor', merk: 'Honda', model: 'Beat / Vario / Mio', tipe: 'Small' },
    { kendaraan: 'Motor', merk: 'Yamaha', model: 'NMAX / PCX / Aerox', tipe: 'Medium' },
    { kendaraan: 'Motor', merk: 'Kawasaki', model: 'ZX25R / Ninja 250', tipe: 'Large' }
  ];
  for (const v of vehicles) {
    const { error } = await supabase.from('vehicle_categories').insert([v]);
    if (error && error.code !== '23505') console.log('Insert err:', error.message);
  }
  console.log('Vehicles done.');
}
migrate();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rcwtfkwksyzssppnnsdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjd3Rma3drc3l6c3NwcG5uc2RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI0OTk3OSwiZXhwIjoyMTA0ODI1OTc5fQ.CJ_h2KA7aum2ZhlhYImGPZFEKoOyeh1qefIDKYWYtsc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Migrating multiplier...');
    const { data: dbStaff } = await supabase.from('staff').select('*');
    
    if (dbStaff) {
      for (const s of dbStaff) {
        if (s.nama === 'Topa') {
          await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 0, berlaku_mulai: '2025-01-01', dientry_oleh: null });
          await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 10, berlaku_mulai: '2026-12-01', dientry_oleh: null });
        } else if (s.nama === 'Budi Santoso') {
          await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 5, berlaku_mulai: '2026-01-01', dientry_oleh: null });
        } else if (s.nama === 'Agus Prayitno') {
          await supabase.from('staff_komisi_multiplier').insert({ staff_id: s.id, multiplier: 0, berlaku_mulai: '2025-06-01', dientry_oleh: null });
        }
      }
    }
    console.log('Multiplier done.');
}
migrate();

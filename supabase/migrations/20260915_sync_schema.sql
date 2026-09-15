-- =========================================================================
-- CARWASH MASTER - MIGRATION & SCHEMA SYNCHRONIZATION
-- Safe, Non-Destructive Migration for Supabase PostgreSQL
-- =========================================================================

-- 1. Ensure Table: users
create table if not exists users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  nama text not null,
  role text not null check (role in ('admin','spv','owner','sistem_owner')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- 2. Ensure Table: staff
create table if not exists staff (
  id serial primary key,
  nama text not null,
  role text not null,
  aktif boolean default true
);

-- 3. Ensure Table: staff_komisi_multiplier
create table if not exists staff_komisi_multiplier (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  multiplier numeric not null default 0,
  berlaku_mulai date not null default current_date,
  dientry_oleh int references users(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Ensure Table: vehicle_categories & missing columns
create table if not exists vehicle_categories (
  id serial primary key,
  kendaraan text not null,
  merk text,
  model text,
  tipe text not null,
  kategori int,
  keterangan text
);
alter table vehicle_categories add column if not exists merk text;
alter table vehicle_categories add column if not exists model text;
alter table vehicle_categories add column if not exists kategori int;
alter table vehicle_categories add column if not exists keterangan text;

-- 5. Ensure Table: price_list & columns
create table if not exists price_list (
  id serial primary key,
  kendaraan text not null,
  paket text not null,
  fasilitas text not null,
  tipe text not null,
  harga numeric not null default 0,
  komisi_washer numeric default 0,
  komisi_checker numeric default 0
);
alter table price_list add column if not exists komisi_washer numeric default 0;
alter table price_list add column if not exists komisi_checker numeric default 0;

-- 6. Ensure Table: price_list_komisi
create table if not exists price_list_komisi (
  id serial primary key,
  price_list_id int references price_list(id) on delete cascade,
  peran text not null,
  komisi numeric not null default 0
);

-- 7. Ensure Table: customers & columns
create table if not exists customers (
  id serial primary key,
  nopol text unique not null,
  nama text,
  hp text,
  kendaraan text,
  tier text default 'reguler',
  total_kunjungan int default 0,
  total_omzet numeric default 0,
  created_at timestamptz default now()
);
alter table customers add column if not exists nama text;
alter table customers add column if not exists hp text;
alter table customers add column if not exists kendaraan text;
alter table customers add column if not exists tier text default 'reguler';
alter table customers add column if not exists total_kunjungan int default 0;
alter table customers add column if not exists total_omzet numeric default 0;
alter table customers add column if not exists created_at timestamptz default now();

-- 8. Ensure Table: nopol_history
create table if not exists nopol_history (
  id serial primary key,
  customer_id int references customers(id) on delete cascade,
  nopol_lama text not null,
  nopol_baru text not null,
  intensitas_saat_pindah int not null default 0,
  diubah_oleh int references users(id) on delete set null,
  tanggal_ubah timestamptz default now()
);

-- 9. Ensure Table: transactions & ALL required columns
create table if not exists transactions (
  id bigserial primary key,
  no_transaksi text,
  tanggal date not null default current_date,
  waktu time not null default current_time,
  customer_id int references customers(id) on delete set null,
  price_list_id int references price_list(id) on delete set null,
  harga numeric not null default 0,
  harga_standar numeric,
  harga_disesuaikan boolean default false,
  no_polisi text,
  kendaraan text,
  tipe text,
  paket_nama text,
  komisi_washer numeric default 0,
  komisi_checker numeric default 0,
  metode_bayar text,
  status_piutang text,
  tanggal_lunas timestamptz,
  keterangan text,
  kasir_id int references users(id) on delete set null,
  status text not null default 'aktif',
  status_pengerjaan text not null default 'proses',
  waktu_selesai timestamptz,
  created_by text,
  created_at timestamptz default now()
);

-- Safe column additions for existing transactions table:
alter table transactions add column if not exists waktu time default current_time;
alter table transactions add column if not exists customer_id int references customers(id) on delete set null;
alter table transactions add column if not exists price_list_id int references price_list(id) on delete set null;
alter table transactions add column if not exists keterangan text;
alter table transactions add column if not exists harga_standar numeric;
alter table transactions add column if not exists harga_disesuaikan boolean default false;
alter table transactions add column if not exists kasir_id int references users(id) on delete set null;
alter table transactions add column if not exists status_piutang text;
alter table transactions add column if not exists tanggal_lunas timestamptz;
alter table transactions add column if not exists waktu_selesai timestamptz;
alter table transactions add column if not exists komisi_washer numeric default 0;
alter table transactions add column if not exists komisi_checker numeric default 0;
alter table transactions add column if not exists created_by text;

-- Make denormalized columns nullable so both normalized and denormalized workflows succeed safely:
alter table transactions alter column no_transaksi drop not null;
alter table transactions alter column no_polisi drop not null;
alter table transactions alter column kendaraan drop not null;
alter table transactions alter column tipe drop not null;
alter table transactions alter column paket_nama drop not null;
alter table transactions alter column status set default 'aktif';
alter table transactions alter column status_pengerjaan set default 'proses';

-- 10. Ensure Table: transaction_staff
create table if not exists transaction_staff (
  id serial primary key,
  transaction_id bigint references transactions(id) on delete cascade,
  staff_id int references staff(id) on delete cascade,
  peran text,
  komisi numeric not null default 0
);
alter table transaction_staff add column if not exists peran text;
alter table transaction_staff add column if not exists komisi numeric default 0;

-- 11. Ensure Table: transaction_void_log
create table if not exists transaction_void_log (
  id serial primary key,
  transaction_id bigint references transactions(id) on delete cascade,
  alasan text not null,
  di_void_oleh int references users(id) on delete set null,
  tanggal_void timestamptz default now()
);

-- 12. Ensure Table: daily_closing & columns
create table if not exists daily_closing (
  id serial primary key,
  tanggal date not null default current_date,
  kasir_id int references users(id) on delete set null,
  total_transaksi int not null default 0,
  total_omzet numeric not null default 0,
  total_tunai numeric default 0,
  total_qris numeric default 0,
  total_piutang numeric default 0,
  total_promo numeric default 0,
  jumlah_transaksi int default 0,
  closed_by int references users(id) on delete set null,
  ditutup_pada timestamptz default now(),
  created_at timestamptz default now()
);
alter table daily_closing add column if not exists kasir_id int references users(id) on delete set null;
alter table daily_closing add column if not exists total_transaksi int default 0;
alter table daily_closing add column if not exists total_promo numeric default 0;
alter table daily_closing add column if not exists ditutup_pada timestamptz default now();
alter table daily_closing alter column jumlah_transaksi drop not null;

-- 13. Ensure Table: komisi_manual
create table if not exists komisi_manual (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  tanggal date not null default current_date,
  keterangan text not null,
  nominal numeric not null default 0,
  dientry_oleh int references users(id) on delete set null,
  created_at timestamptz default now()
);

-- 14. Ensure Table: attendance
create table if not exists attendance (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  tanggal date not null default current_date,
  status text not null,
  keterangan text,
  created_at timestamptz default now()
);

-- 15. Create Performance Indexes & Constraints
create index if not exists idx_transactions_tanggal on transactions(tanggal);
create index if not exists idx_transactions_status on transactions(status, status_pengerjaan);
create index if not exists idx_transactions_customer on transactions(customer_id);
create index if not exists idx_transactions_price_list on transactions(price_list_id);
create index if not exists idx_transactions_kasir on transactions(kasir_id);
create index if not exists idx_customers_nopol on customers(nopol);
create index if not exists idx_daily_closing_tanggal on daily_closing(tanggal);
create index if not exists idx_attendance_tanggal_staff on attendance(tanggal, staff_id);

-- 16. Disable RLS or grant full access to public so application API functions without auth barriers
alter table users enable row level security;
alter table staff enable row level security;
alter table staff_komisi_multiplier enable row level security;
alter table vehicle_categories enable row level security;
alter table price_list enable row level security;
alter table price_list_komisi enable row level security;
alter table customers enable row level security;
alter table nopol_history enable row level security;
alter table transactions enable row level security;
alter table transaction_staff enable row level security;
alter table transaction_void_log enable row level security;
alter table daily_closing enable row level security;
alter table komisi_manual enable row level security;
alter table attendance enable row level security;

-- Permissive policies for web application (authenticated & anon)
do $$
declare
  tbl text;
begin
  for tbl in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop policy if exists "allow_all_ops_%s" on %I;', tbl, tbl);
    execute format('create policy "allow_all_ops_%s" on %I for all using (true) with check (true);', tbl, tbl);
  end loop;
end;
$$;

-- Grant usage to anon and authenticated
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- 17. Reload PostgREST schema cache
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

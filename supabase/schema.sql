-- =========================================================================
-- CARWASH MASTER (BSA CAR WASH) - TAHAP 1 SQL MIGRATION
-- Database: Supabase (PostgreSQL)
-- =========================================================================

-- 1. Table: vehicle_categories
create table if not exists vehicle_categories (
  id serial primary key,
  kendaraan text not null,
  merk text,
  model text,
  tipe text not null,
  keterangan text
);

-- 2. Table: price_list
create table if not exists price_list (
  id serial primary key,
  kendaraan text not null,
  paket text not null,
  fasilitas text not null,
  tipe text not null,
  harga numeric not null,
  unique (kendaraan, paket, fasilitas, tipe)
);

-- 3. Table: price_list_komisi
-- Struktur fleksibel per-role (washer, checker, kasir, leader, marketing, dll)
create table if not exists price_list_komisi (
  id serial primary key,
  price_list_id int references price_list(id) on delete cascade,
  peran text not null,        -- BEBAS: 'washer', 'checker', 'kasir', 'leader', 'marketing', dll
  komisi numeric not null default 0,
  unique (price_list_id, peran)
);

-- 4. Table: users
-- Hierarki role: admin (kasir), spv, owner, sistem_owner
create table if not exists users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  nama text not null,
  role text not null check (role in ('admin','spv','owner','sistem_owner')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- 5. Table: staff
create table if not exists staff (
  id serial primary key,
  nama text not null,
  role text not null,        -- BEBAS: washer/checker/leader/marketing, validasi di UI
  aktif boolean default true
);

-- 6. Table: staff_komisi_multiplier
-- Riwayat multiplier komisi per staff (tidak dihapus/ditimpa)
create table if not exists staff_komisi_multiplier (
  id serial primary key,
  staff_id int references staff(id) on delete cascade,
  multiplier numeric not null,     -- persen tambahan, misal 10 = +10%. 0 = tanpa tambahan
  berlaku_mulai date not null,     -- tanggal efektif mulai berlaku
  dientry_oleh int references users(id) on delete set null,
  created_at timestamptz default now()
);

-- =========================================================================
-- INITIAL SEED DATA (TAHAP 1)
-- =========================================================================

-- Seed Users
insert into users (username, password_hash, nama, role, aktif)
values 
  ('wiro', 'wiro123', 'Wiro (Sistem Owner)', 'sistem_owner', true),
  ('owner', 'owner123', 'Pak BSA (Owner)', 'owner', true),
  ('spv', 'spv123', 'Siti SPV Keuangan', 'spv', true),
  ('kasir', 'kasir123', 'Kasir Admin 1', 'admin', true)
on conflict (username) do nothing;

-- Seed Vehicle Categories
insert into vehicle_categories (kendaraan, merk, model, tipe, keterangan)
values
  ('Mobil', 'Toyota', 'Avanza / Xenia / Ertiga', 'Medium', 'MPV Kompak Standard'),
  ('Mobil', 'Toyota', 'Fortuner / Pajero / Alphard', 'Large', 'SUV & Premium Van'),
  ('Mobil', 'Honda', 'Brio / Yaris / Jazz', 'Small', 'City Car & Hatchback'),
  ('Motor', 'Honda', 'Beat / Vario / Mio', 'Small', 'Matic Kompak < 125cc'),
  ('Motor', 'Yamaha', 'NMAX / PCX / Aerox', 'Medium', 'Matic Maxi 150-160cc'),
  ('Motor', 'Kawasaki', 'ZX25R / Ninja 250', 'Large', 'Sport & Big Bike > 250cc')
on conflict do nothing;

-- Seed Price List
insert into price_list (kendaraan, paket, fasilitas, tipe, harga)
values
  ('Mobil', 'Cuci Body + Semir', 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber', 'Small', 40000),
  ('Mobil', 'Cuci Body + Semir', 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber', 'Medium', 50000),
  ('Mobil', 'Cuci Body + Semir', 'Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber', 'Large', 65000),
  ('Mobil', 'Cuci Salju + Wax Coating', 'Cuci Kolong, Snow Wash, Premium Wax, Interior Clean, Semir Premium', 'Medium', 120000),
  ('Motor', 'Cuci Regular', 'Shampoo Snow, Semir Ban, Pengeringan', 'Small', 15000),
  ('Motor', 'Cuci Regular + Detail', 'Shampoo Snow, Semir Ban, Detail Mesin, Polish Bodi', 'Medium', 30000)
on conflict (kendaraan, paket, fasilitas, tipe) do nothing;

-- Seed Price List Komisi per Role (Washer, Checker, Kasir)
-- Menggunakan sub-query mencari price_list_id
insert into price_list_komisi (price_list_id, peran, komisi)
select id, 'washer', 8000 from price_list where paket = 'Cuci Body + Semir' and tipe = 'Small' and kendaraan = 'Mobil'
union all
select id, 'checker', 4000 from price_list where paket = 'Cuci Body + Semir' and tipe = 'Small' and kendaraan = 'Mobil'
union all
select id, 'washer', 10000 from price_list where paket = 'Cuci Body + Semir' and tipe = 'Medium' and kendaraan = 'Mobil'
union all
select id, 'checker', 5000 from price_list where paket = 'Cuci Body + Semir' and tipe = 'Medium' and kendaraan = 'Mobil'
union all
select id, 'washer', 13000 from price_list where paket = 'Cuci Body + Semir' and tipe = 'Large' and kendaraan = 'Mobil'
union all
select id, 'checker', 6000 from price_list where paket = 'Cuci Body + Semir' and tipe = 'Large' and kendaraan = 'Mobil'
union all
select id, 'washer', 25000 from price_list where paket = 'Cuci Salju + Wax Coating' and tipe = 'Medium' and kendaraan = 'Mobil'
union all
select id, 'checker', 12000 from price_list where paket = 'Cuci Salju + Wax Coating' and tipe = 'Medium' and kendaraan = 'Mobil'
union all
select id, 'washer', 3000 from price_list where paket = 'Cuci Regular' and tipe = 'Small' and kendaraan = 'Motor'
union all
select id, 'checker', 1500 from price_list where paket = 'Cuci Regular' and tipe = 'Small' and kendaraan = 'Motor'
union all
select id, 'washer', 6000 from price_list where paket = 'Cuci Regular + Detail' and tipe = 'Medium' and kendaraan = 'Motor'
union all
select id, 'checker', 3000 from price_list where paket = 'Cuci Regular + Detail' and tipe = 'Medium' and kendaraan = 'Motor'
on conflict (price_list_id, peran) do nothing;

-- Seed Staff
insert into staff (nama, role, aktif)
values
  ('Topa', 'washer', true),
  ('Budi Santoso', 'washer', true),
  ('Agus Prayitno', 'checker', true),
  ('Rudi Hermawan', 'leader', true),
  ('Dedi Kurniawan', 'washer', false)
on conflict do nothing;

-- Seed Staff Komisi Multiplier
insert into staff_komisi_multiplier (staff_id, multiplier, berlaku_mulai, dientry_oleh)
select s.id, 0, '2025-01-01', u.id
from staff s cross join users u
where s.nama = 'Topa' and u.username = 'wiro'
union all
select s.id, 10, '2026-12-01', u.id
from staff s cross join users u
where s.nama = 'Topa' and u.username = 'wiro'
union all
select s.id, 5, '2026-01-01', u.id
from staff s cross join users u
where s.nama = 'Budi Santoso' and u.username = 'wiro'
union all
select s.id, 0, '2025-06-01', u.id
from staff s cross join users u
where s.nama = 'Agus Prayitno' and u.username = 'wiro'
on conflict do nothing;

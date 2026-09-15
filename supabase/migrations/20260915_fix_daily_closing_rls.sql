-- =========================================================================
-- MIGRATION: Fix RLS Policies and Unique Constraint for Table 'daily_closing'
-- =========================================================================

-- 1. Ensure Table Structure & Columns exist
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

-- Ensure all columns exist for daily_closing
alter table daily_closing add column if not exists kasir_id int references users(id) on delete set null;
alter table daily_closing add column if not exists total_transaksi int default 0;
alter table daily_closing add column if not exists total_omzet numeric default 0;
alter table daily_closing add column if not exists total_tunai numeric default 0;
alter table daily_closing add column if not exists total_qris numeric default 0;
alter table daily_closing add column if not exists total_piutang numeric default 0;
alter table daily_closing add column if not exists total_promo numeric default 0;
alter table daily_closing add column if not exists jumlah_transaksi int default 0;
alter table daily_closing add column if not exists closed_by int references users(id) on delete set null;
alter table daily_closing add column if not exists ditutup_pada timestamptz default now();
alter table daily_closing add column if not exists created_at timestamptz default now();

-- 2. Add Unique Constraint on (tanggal, kasir_id) to prevent duplicate closings per shift
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_daily_closing_tanggal_kasir'
  ) then
    -- Clean any duplicate entries prior to adding constraint (keeps newest entry)
    delete from daily_closing a using daily_closing b
    where a.id < b.id 
      and a.tanggal = b.tanggal 
      and (a.kasir_id = b.kasir_id or (a.kasir_id is null and b.kasir_id is null));

    alter table daily_closing add constraint uq_daily_closing_tanggal_kasir unique (tanggal, kasir_id);
  end if;
end;
$$;

-- 3. Indexes for lookup performance
create index if not exists idx_daily_closing_tanggal on daily_closing(tanggal);
create index if not exists idx_daily_closing_kasir on daily_closing(kasir_id);

-- 4. Enable Row Level Security (RLS) on daily_closing
alter table daily_closing enable row level security;

-- 5. Drop any legacy/conflicting policies on daily_closing
drop policy if exists "allow_all_ops_daily_closing" on daily_closing;
drop policy if exists "allow_select_daily_closing" on daily_closing;
drop policy if exists "allow_insert_daily_closing" on daily_closing;
drop policy if exists "allow_update_daily_closing" on daily_closing;
drop policy if exists "allow_delete_daily_closing" on daily_closing;

-- 6. Define Explicit RLS Policies for Carwash Master Role System

-- (A) SELECT Policy: Allow all users to read closing summary records (cashier preview, audit, reports)
create policy "allow_select_daily_closing" on daily_closing
  for select
  to anon, authenticated, service_role
  using (true);

-- (B) INSERT Policy: Allow INSERT only if the kasir/closer is a valid, active user with an authorized operational role
create policy "allow_insert_daily_closing" on daily_closing
  for insert
  to anon, authenticated, service_role
  with check (
    exists (
      select 1 from users u
      where u.id = daily_closing.kasir_id
        and u.aktif = true
        and u.role in ('admin', 'spv', 'owner', 'sistem_owner')
    )
    and (
      daily_closing.closed_by is null or exists (
        select 1 from users u2
        where u2.id = daily_closing.closed_by
          and u2.aktif = true
          and u2.role in ('admin', 'spv', 'owner', 'sistem_owner')
      )
    )
    and daily_closing.tanggal is not null
    and daily_closing.total_omzet >= 0
    and daily_closing.total_transaksi >= 0
  );

-- (C) UPDATE Policy: Allow update if kasir_id references an active user
create policy "allow_update_daily_closing" on daily_closing
  for update
  to anon, authenticated, service_role
  using (true)
  with check (
    exists (
      select 1 from users u
      where u.id = daily_closing.kasir_id
        and u.aktif = true
    )
  );

-- (D) DELETE Policy: Allow reopening shift (delete closing record)
create policy "allow_delete_daily_closing" on daily_closing
  for delete
  to anon, authenticated, service_role
  using (true);

-- 7. Grant Schema & Table Permissions to PostgreSQL Roles
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table daily_closing to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

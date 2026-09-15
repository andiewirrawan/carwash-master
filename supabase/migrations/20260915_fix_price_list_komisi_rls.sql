-- ==============================================================================
-- CARWASH MASTER - MIGRATION: RLS & PERMISSIONS FOR price_list & price_list_komisi
-- ==============================================================================

-- 1. Pastikan tabel price_list & price_list_komisi mengaktifkan RLS
alter table if exists public.price_list enable row level security;
alter table if exists public.price_list_komisi enable row level security;

-- 2. Bersihkan policy lama jika ada agar tidak terjadi konflik
drop policy if exists "price_list_select_policy" on public.price_list;
drop policy if exists "price_list_insert_policy" on public.price_list;
drop policy if exists "price_list_update_policy" on public.price_list;
drop policy if exists "price_list_delete_policy" on public.price_list;
drop policy if exists "allow_all_ops_price_list" on public.price_list;

drop policy if exists "price_list_komisi_select_policy" on public.price_list_komisi;
drop policy if exists "price_list_komisi_insert_policy" on public.price_list_komisi;
drop policy if exists "price_list_komisi_update_policy" on public.price_list_komisi;
drop policy if exists "price_list_komisi_delete_policy" on public.price_list_komisi;
drop policy if exists "allow_all_ops_price_list_komisi" on public.price_list_komisi;

-- 3. Policy SELECT: Mengizinkan pembacaan price_list dan komisi untuk anon, authenticated, dan service_role
create policy "price_list_select_policy" on public.price_list
  for select
  to anon, authenticated, service_role
  using (true);

create policy "price_list_komisi_select_policy" on public.price_list_komisi
  for select
  to anon, authenticated, service_role
  using (true);

-- 4. Policy INSERT, UPDATE, DELETE: Hanya via service_role atau fungsi RPC yang berotoritas
create policy "price_list_insert_policy" on public.price_list
  for insert
  to service_role
  with check (true);

create policy "price_list_update_policy" on public.price_list
  for update
  to service_role
  using (true)
  with check (true);

create policy "price_list_delete_policy" on public.price_list
  for delete
  to service_role
  using (true);

create policy "price_list_komisi_insert_policy" on public.price_list_komisi
  for insert
  to service_role
  with check (true);

create policy "price_list_komisi_update_policy" on public.price_list_komisi
  for update
  to service_role
  using (true)
  with check (true);

create policy "price_list_komisi_delete_policy" on public.price_list_komisi
  for delete
  to service_role
  using (true);

-- ==============================================================================
-- 5. RPC FUNCTIONS: SECURITY DEFINER UNTUK MANAJEMEN HARGA & KOMISI
-- ==============================================================================

-- Fungsi Update / Upsert Harga & Komisi
create or replace function sp_update_price_list_sistem_owner(
  p_requesting_user_id int,
  p_price_list_id int,
  p_kendaraan text default null,
  p_paket text default null,
  p_fasilitas text default null,
  p_tipe text default null,
  p_harga numeric default null,
  p_komisi_json jsonb default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_caller record;
  v_role record;
  v_result jsonb;
  v_washer numeric := 0;
  v_checker numeric := 0;
begin
  -- 1. Verifikasi Pemanggil memiliki wewenang (spv, owner, sistem_owner)
  select id, username, role, aktif into v_caller
  from users
  where id = p_requesting_user_id;

  if not found or not v_caller.aktif or v_caller.role not in ('spv', 'owner', 'sistem_owner') then
    raise exception 'Akses ditolak: User peminta tidak memiliki izin mengelola Harga & Komisi.';
  end if;

  -- 2. Pastikan paket ada
  if not exists (select 1 from price_list where id = p_price_list_id) then
    raise exception 'Paket layanan (ID: %) tidak ditemukan.', p_price_list_id;
  end if;

  -- 3. Hitung washer & checker dari json jika ada
  if p_komisi_json is not null then
    select coalesce(max(case when lower(value->>'peran') = 'washer' then (value->>'komisi')::numeric end), 0),
           coalesce(max(case when lower(value->>'peran') = 'checker' then (value->>'komisi')::numeric end), 0)
    into v_washer, v_checker
    from jsonb_array_elements(p_komisi_json);
  end if;

  -- 4. Update data price_list
  update price_list
  set
    kendaraan = coalesce(trim(p_kendaraan), kendaraan),
    paket = coalesce(trim(p_paket), paket),
    fasilitas = coalesce(trim(p_fasilitas), fasilitas),
    tipe = coalesce(trim(p_tipe), tipe),
    harga = coalesce(p_harga, harga),
    komisi_washer = case when p_komisi_json is not null then v_washer else komisi_washer end,
    komisi_checker = case when p_komisi_json is not null then v_checker else komisi_checker end
  where id = p_price_list_id;

  -- 5. Sinkronisasi price_list_komisi
  if p_komisi_json is not null then
    delete from price_list_komisi where price_list_id = p_price_list_id;

    insert into price_list_komisi (price_list_id, peran, komisi)
    select
      p_price_list_id,
      lower(trim(value->>'peran')),
      coalesce((value->>'komisi')::numeric, 0)
    from jsonb_array_elements(p_komisi_json)
    where trim(value->>'peran') <> '';
  end if;

  -- 6. Return data paket terupdate
  select jsonb_build_object(
    'id', p.id,
    'kendaraan', p.kendaraan,
    'paket', p.paket,
    'fasilitas', p.fasilitas,
    'tipe', p.tipe,
    'harga', p.harga,
    'komisi_washer', p.komisi_washer,
    'komisi_checker', p.komisi_checker
  ) into v_result
  from price_list p
  where p.id = p_price_list_id;

  return v_result;
end;
$$;

-- Grant izin eksekusi RPC
grant execute on function sp_update_price_list_sistem_owner(int, int, text, text, text, text, numeric, jsonb) to anon, authenticated, service_role;

-- 6. Reload cache schema PostgREST
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

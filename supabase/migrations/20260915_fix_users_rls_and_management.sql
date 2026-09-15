-- ==============================================================================
-- CARWASH MASTER - MIGRATION: RLS & USER MANAGEMENT (KHUSUS SISTEM OWNER)
-- Tanggal: 2026-09-15
-- Deskripsi:
-- 1. Menjaga struktur tabel `users` tetap utuh (id, username, password_hash, nama, role, aktif, created_at)
-- 2. Menjaga RLS aktif (ENABLE ROW LEVEL SECURITY)
-- 3. Mengatur RLS policy:
--    - SELECT: Diizinkan untuk pengecekan login & baca data oleh aplikasi
--    - INSERT/UPDATE/DELETE: Khusus role 'sistem_owner' melalui service_role / RPC Security Definer
-- 4. Membuat fungsi RPC (Stored Procedures) berizin SECURITY DEFINER:
--    - sp_add_user_sistem_owner
--    - sp_update_user_sistem_owner
--    - sp_reset_password_sistem_owner
--    - sp_delete_user_sistem_owner
-- ==============================================================================

-- 1. Pastikan tabel users sudah ada dan aktif RLS
create table if not exists users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  nama text not null,
  role text not null default 'admin', -- 'admin' (kasir), 'spv', 'owner', 'sistem_owner'
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

-- 2. Bersihkan policy lama pada tabel users agar tidak bentrok
drop policy if exists "allow_all_ops_users" on users;
drop policy if exists "allow_select_users" on users;
drop policy if exists "allow_insert_users" on users;
drop policy if exists "allow_update_users" on users;
drop policy if exists "allow_delete_users" on users;
drop policy if exists "users_select_policy" on users;
drop policy if exists "users_insert_policy" on users;
drop policy if exists "users_update_policy" on users;
drop policy if exists "users_delete_policy" on users;

-- 3. Policy SELECT: Mengizinkan pembacaan data akun untuk otentikasi login & tampilan aplikasi
create policy "users_select_policy" on users
  for select
  to anon, authenticated, service_role
  using (true);

-- 4. Policy INSERT: Hanya diizinkan via service_role (server backend yang memverifikasi sistem_owner)
create policy "users_insert_policy" on users
  for insert
  to service_role
  with check (true);

-- 5. Policy UPDATE: Hanya diizinkan via service_role
create policy "users_update_policy" on users
  for update
  to service_role
  using (true)
  with check (true);

-- 6. Policy DELETE: Hanya diizinkan via service_role
create policy "users_delete_policy" on users
  for delete
  to service_role
  using (true);

-- ==============================================================================
-- 7. RPC FUNCTIONS: KEAMANAN BERLAPIS KHUSUS SISTEM OWNER
-- ==============================================================================

-- A. Fungsi Tambah User Baru
create or replace function sp_add_user_sistem_owner(
  p_requesting_user_id int,
  p_username text,
  p_password_hash text,
  p_nama text,
  p_role text default 'admin',
  p_aktif boolean default true
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_caller record;
  v_new_id int;
  v_clean_username text;
  v_result jsonb;
begin
  -- 1. Verifikasi Pemanggil adalah SISTEM OWNER yang aktif
  select id, username, role, aktif into v_caller
  from users
  where id = p_requesting_user_id;

  if not found then
    raise exception 'Akses ditolak: User peminta (ID: %) tidak ditemukan.', p_requesting_user_id;
  end if;

  if not v_caller.aktif then
    raise exception 'Akses ditolak: Akun Sistem Owner Anda tidak aktif.';
  end if;

  if v_caller.role <> 'sistem_owner' then
    raise exception 'Akses ditolak: Role "%" tidak memiliki izin menambah user. Fitur ini khusus Sistem Owner.', v_caller.role;
  end if;

  -- 2. Validasi input
  v_clean_username := lower(trim(p_username));
  if v_clean_username is null or v_clean_username = '' then
    raise exception 'Username wajib diisi.';
  end if;

  if p_nama is null or trim(p_nama) = '' then
    raise exception 'Nama lengkap wajib diisi.';
  end if;

  if p_password_hash is null or trim(p_password_hash) = '' then
    raise exception 'Password wajib diisi.';
  end if;

  if p_role not in ('admin', 'spv', 'owner', 'sistem_owner') then
    raise exception 'Role "%" tidak valid. Role harus: admin, spv, owner, atau sistem_owner.', p_role;
  end if;

  -- 3. Cek apakah username sudah dipakai
  if exists (select 1 from users where lower(username) = v_clean_username) then
    raise exception 'Username "%" sudah terdaftar. Silakan gunakan username lain.', v_clean_username;
  end if;

  -- 4. Lakukan Insert User
  insert into users (username, password_hash, nama, role, aktif, created_at)
  values (v_clean_username, trim(p_password_hash), trim(p_nama), p_role, coalesce(p_aktif, true), now())
  returning id into v_new_id;

  -- 5. Return data user baru (tanpa password_hash untuk keamanan)
  select jsonb_build_object(
    'id', id,
    'username', username,
    'nama', nama,
    'role', role,
    'aktif', aktif,
    'created_at', created_at
  ) into v_result
  from users
  where id = v_new_id;

  return v_result;
end;
$$;

-- B. Fungsi Update User (Edit Nama, Role, Status Aktif/Nonaktif, Username)
create or replace function sp_update_user_sistem_owner(
  p_requesting_user_id int,
  p_target_user_id int,
  p_username text default null,
  p_nama text default null,
  p_role text default null,
  p_aktif boolean default null,
  p_password_hash text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_caller record;
  v_clean_username text;
  v_result jsonb;
begin
  -- 1. Verifikasi Pemanggil adalah SISTEM OWNER yang aktif
  select id, username, role, aktif into v_caller
  from users
  where id = p_requesting_user_id;

  if not found or not v_caller.aktif or v_caller.role <> 'sistem_owner' then
    raise exception 'Akses ditolak: Hanya Sistem Owner yang berhak memperbarui user.';
  end if;

  -- 2. Pastikan target user ada
  if not exists (select 1 from users where id = p_target_user_id) then
    raise exception 'User target (ID: %) tidak ditemukan.', p_target_user_id;
  end if;

  -- 3. Cek duplikasi username jika username diubah
  if p_username is not null and trim(p_username) <> '' then
    v_clean_username := lower(trim(p_username));
    if exists (select 1 from users where lower(username) = v_clean_username and id <> p_target_user_id) then
      raise exception 'Username "%" sudah digunakan oleh akun lain.', v_clean_username;
    end if;

    update users set username = v_clean_username where id = p_target_user_id;
  end if;

  -- 4. Update field lainnya
  if p_nama is not null and trim(p_nama) <> '' then
    update users set nama = trim(p_nama) where id = p_target_user_id;
  end if;

  if p_role is not null then
    if p_role not in ('admin', 'spv', 'owner', 'sistem_owner') then
      raise exception 'Role "%" tidak valid.', p_role;
    end if;
    update users set role = p_role where id = p_target_user_id;
  end if;

  if p_aktif is not null then
    update users set aktif = p_aktif where id = p_target_user_id;
  end if;

  if p_password_hash is not null and trim(p_password_hash) <> '' then
    update users set password_hash = trim(p_password_hash) where id = p_target_user_id;
  end if;

  -- 5. Return data user yang telah diupdate
  select jsonb_build_object(
    'id', id,
    'username', username,
    'nama', nama,
    'role', role,
    'aktif', aktif,
    'created_at', created_at
  ) into v_result
  from users
  where id = p_target_user_id;

  return v_result;
end;
$$;

-- C. Fungsi Reset Password
create or replace function sp_reset_password_sistem_owner(
  p_requesting_user_id int,
  p_target_user_id int,
  p_new_password_hash text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_caller record;
begin
  select id, username, role, aktif into v_caller
  from users
  where id = p_requesting_user_id;

  if not found or not v_caller.aktif or v_caller.role <> 'sistem_owner' then
    raise exception 'Akses ditolak: Hanya Sistem Owner yang berhak mereset password.';
  end if;

  if p_new_password_hash is null or trim(p_new_password_hash) = '' then
    raise exception 'Password baru tidak boleh kosong.';
  end if;

  update users
  set password_hash = trim(p_new_password_hash)
  where id = p_target_user_id;

  return true;
end;
$$;

-- D. Fungsi Hapus User
create or replace function sp_delete_user_sistem_owner(
  p_requesting_user_id int,
  p_target_user_id int
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_caller record;
begin
  select id, username, role, aktif into v_caller
  from users
  where id = p_requesting_user_id;

  if not found or not v_caller.aktif or v_caller.role <> 'sistem_owner' then
    raise exception 'Akses ditolak: Hanya Sistem Owner yang berhak menghapus user.';
  end if;

  if p_target_user_id = p_requesting_user_id then
    raise exception 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.';
  end if;

  delete from users where id = p_target_user_id;
  return true;
end;
$$;

-- 8. Grant Izin Eksekusi Fungsi RPC ke anon & authenticated
grant execute on function sp_add_user_sistem_owner(int, text, text, text, text, boolean) to anon, authenticated, service_role;
grant execute on function sp_update_user_sistem_owner(int, int, text, text, text, boolean, text) to anon, authenticated, service_role;
grant execute on function sp_reset_password_sistem_owner(int, int, text) to anon, authenticated, service_role;
grant execute on function sp_delete_user_sistem_owner(int, int) to anon, authenticated, service_role;

-- 9. Refresh Schema Cache
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

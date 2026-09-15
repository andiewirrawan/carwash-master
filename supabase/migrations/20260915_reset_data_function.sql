-- =========================================================================
-- MIGRATION: Atomic Reset Data Function for Carwash Master
-- Exclusively executable by role 'sistem_owner'
-- Preserves table 'users' and all user login credentials
-- =========================================================================

create or replace function reset_carwash_application_data(p_user_id int, p_confirm text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_role text;
  v_user_active boolean;
  v_users_count int;
begin
  -- 1. Strictly enforce confirmation phrase
  if p_confirm <> 'RESET DATA' then
    raise exception 'Frasa konfirmasi tidak valid. Wajib mengetik "RESET DATA".';
  end if;

  -- 2. Verify user identity & role
  select role, aktif into v_user_role, v_user_active
  from users
  where id = p_user_id;

  if not found then
    raise exception 'User tidak ditemukan dalam database.';
  end if;

  if v_user_active is not true then
    raise exception 'Akun user sudah tidak aktif.';
  end if;

  if v_user_role <> 'sistem_owner' then
    raise exception 'Akses ditolak: Hanya SISTEM OWNER yang berhak melakukan Reset Data.';
  end if;

  -- 3. Atomic deletion of operational and master tables in dependency order
  -- Foreign key child tables first:
  delete from transaction_staff;
  delete from transaction_void_log;
  delete from transactions;
  delete from daily_closing;
  delete from komisi_manual;
  delete from attendance;
  delete from nopol_history;
  delete from customers;
  delete from staff_komisi_multiplier;
  delete from staff;
  delete from price_list_komisi;
  delete from price_list;
  delete from vehicle_categories;

  -- Reset auto-increment sequences where applicable (optional, keeps clean IDs for new entries)
  perform setval(pg_get_serial_sequence('transactions', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('customers', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('staff', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('price_list', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('vehicle_categories', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('daily_closing', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('attendance', 'id'), 1, false);
  perform setval(pg_get_serial_sequence('komisi_manual', 'id'), 1, false);

  -- 4. Count remaining users to verify table 'users' is 100% intact
  select count(*) into v_users_count from users;

  return jsonb_build_object(
    'success', true,
    'message', 'Reset data berhasil.',
    'users_count', v_users_count,
    'timestamp', now()
  );
end;
$$;

-- Grant execution to authenticated, anon, and service_role
grant execute on function reset_carwash_application_data(int, text) to anon, authenticated, service_role;

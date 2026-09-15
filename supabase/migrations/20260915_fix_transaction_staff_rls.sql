-- ==============================================================================
-- CARWASH MASTER - MIGRATION: RLS & PERMISSIONS FOR transaction_staff & transactions
-- ==============================================================================

-- 1. Enable RLS on transaction_staff & transactions
alter table if exists public.transaction_staff enable row level security;
alter table if exists public.transactions enable row level security;

-- 2. Drop existing policies to prevent conflicts
drop policy if exists "transaction_staff_select_policy" on public.transaction_staff;
drop policy if exists "transaction_staff_insert_policy" on public.transaction_staff;
drop policy if exists "transaction_staff_update_policy" on public.transaction_staff;
drop policy if exists "transaction_staff_delete_policy" on public.transaction_staff;
drop policy if exists "allow_all_ops_transaction_staff" on public.transaction_staff;

-- 3. Policy SELECT: Allow reading assigned staff for all roles (anon, authenticated, service_role)
create policy "transaction_staff_select_policy" on public.transaction_staff
  for select
  to anon, authenticated, service_role
  using (true);

-- 4. Policy INSERT, UPDATE, DELETE: Allowed for anon, authenticated, and service_role for seamless staff assignment
create policy "transaction_staff_insert_policy" on public.transaction_staff
  for insert
  to anon, authenticated, service_role
  with check (true);

create policy "transaction_staff_update_policy" on public.transaction_staff
  for update
  to anon, authenticated, service_role
  using (true)
  with check (true);

create policy "transaction_staff_delete_policy" on public.transaction_staff
  for delete
  to anon, authenticated, service_role
  using (true);

-- 5. Stored Procedure (RPC) for atomic & safe staff assignment
create or replace function sp_assign_transaction_staff(
  p_transaction_id bigint,
  p_assignments jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_staff_id bigint;
  v_peran text;
  v_komisi numeric;
  v_total_washer numeric := 0;
  v_total_checker numeric := 0;
begin
  -- 1. Hapus penugasan lama untuk transaksi ini
  delete from public.transaction_staff
  where transaction_id = p_transaction_id;

  -- 2. Masukkan penugasan baru dari json array
  if p_assignments is not null and jsonb_array_length(p_assignments) > 0 then
    for v_item in select * from jsonb_array_elements(p_assignments)
    loop
      v_staff_id := (v_item->>'staff_id')::bigint;
      v_peran := lower(trim(coalesce(v_item->>'peran', 'washer')));
      v_komisi := round(coalesce((v_item->>'komisi')::numeric, 0));

      insert into public.transaction_staff (transaction_id, staff_id, peran, komisi)
      values (p_transaction_id, v_staff_id, v_peran, v_komisi);

      if v_peran = 'washer' then
        v_total_washer := v_total_washer + v_komisi;
      elsif v_peran = 'checker' then
        v_total_checker := v_total_checker + v_komisi;
      end if;
    end loop;
  end if;

  -- 3. Update total komisi washer & checker di transactions
  update public.transactions
  set
    komisi_washer = v_total_washer,
    komisi_checker = v_total_checker
  where id = p_transaction_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'total_washer', v_total_washer,
    'total_checker', v_total_checker
  );
end;
$$;

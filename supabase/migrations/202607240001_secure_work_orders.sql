create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('super_admin', 'employee');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.app_role not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number text not null unique,
  title text not null,
  description text not null,
  assignee_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  status text not null default 'Open' check (status in ('Open', 'In progress', 'Blocked', 'Pending approval', 'Completed')),
  due_date date not null,
  shipment_reference text not null default '',
  pickup_location text not null default '',
  destination text not null default '',
  delivery_appointment timestamptz,
  actual_delivery_at timestamptz,
  started_at timestamptz,
  blocked_at timestamptz,
  completed_at timestamptz,
  completion_submitted_at timestamptz,
  resolution_summary text not null default '',
  notes jsonb not null default '[]'::jsonb,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_orders add column if not exists pickup_location text not null default '';
alter table public.work_orders add column if not exists destination text not null default '';
alter table public.work_orders add column if not exists delivery_appointment timestamptz;
alter table public.work_orders add column if not exists actual_delivery_at timestamptz;
alter table public.work_orders add column if not exists started_at timestamptz;
alter table public.work_orders add column if not exists blocked_at timestamptz;
alter table public.work_orders add column if not exists completed_at timestamptz;
alter table public.work_orders add column if not exists completion_submitted_at timestamptz;
alter table public.work_orders add column if not exists resolution_summary text not null default '';
alter table public.work_orders add column if not exists notes jsonb not null default '[]'::jsonb;
alter table public.work_orders add column if not exists status_history jsonb not null default '[]'::jsonb;
alter table public.work_orders drop constraint if exists work_orders_status_check;
alter table public.work_orders add constraint work_orders_status_check check (status in ('Open', 'In progress', 'Blocked', 'Pending approval', 'Completed'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''), 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and active = true
  );
$$;

create or replace function public.update_my_work_order_status(order_id uuid, next_status text)
returns public.work_orders
language plpgsql
security definer set search_path = public
as $$
declare updated_order public.work_orders;
begin
  if next_status not in ('Open', 'In progress', 'Blocked', 'Pending approval') then
    raise exception 'Invalid work-order status';
  end if;
  update public.work_orders
  set status = next_status, updated_at = now()
  where id = order_id and assignee_id = auth.uid()
  returning * into updated_order;
  if updated_order.id is null then raise exception 'Work order not found or access denied'; end if;
  return updated_order;
end;
$$;

alter table public.profiles enable row level security;
alter table public.work_orders enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles super admin update" on public.profiles;
create policy "profiles super admin update" on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "work orders super admin full access" on public.work_orders;
create policy "work orders super admin full access" on public.work_orders
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "employees read assigned work" on public.work_orders;
create policy "employees read assigned work" on public.work_orders
  for select to authenticated
  using (assignee_id = auth.uid() or public.is_super_admin());

revoke all on public.profiles from anon;
revoke all on public.work_orders from anon;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.work_orders to authenticated;
grant execute on function public.update_my_work_order_status(uuid, text) to authenticated;

-- Bootstrap the first super admin after creating that account in Supabase Auth:
-- update public.profiles
-- set role = 'super_admin'
-- where id = (select id from auth.users where email = 'owner@example.com');

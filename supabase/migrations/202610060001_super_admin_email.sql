-- Only info@imanlogistics.com may act as super admin. The API rejects any
-- other super_admin account; these checks make row-level security agree, so
-- the restriction holds even for requests that reach Supabase directly.

create or replace function public.super_admin_email()
returns text
language sql
immutable
as $$
  select 'info@imanlogistics.com'::text;
$$;

-- The sign-in email (auth.users), not the editable profiles.email copy.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.role = 'super_admin' and p.active = true
      and lower(u.email) = public.super_admin_email()
  );
$$;

create or replace function public.is_back_office()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_super_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'admin' and active = true
  );
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select p.role::text from public.profiles p
  where p.id = auth.uid() and p.active = true
    and (p.role::text <> 'super_admin' or public.is_super_admin());
$$;

-- No other account can be given the super_admin role.
create or replace function public.enforce_super_admin_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role = 'super_admin'
    and (tg_op = 'INSERT' or old.role is distinct from new.role)
    and coalesce((select lower(email) from auth.users where id = new.id), '') <> public.super_admin_email() then
    raise exception 'Unauthorized Super Admin account.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_super_admin_email on public.profiles;
create trigger profiles_super_admin_email
  before insert or update of role on public.profiles
  for each row execute procedure public.enforce_super_admin_email();

-- Promote info@imanlogistics.com if that account already exists. Any other
-- super_admin profile (for example rodriguemedor@yahoo.fr) is left as is but
-- no longer has super-admin access anywhere.
update public.profiles
set role = 'super_admin', email = public.super_admin_email(), active = true
where id in (select id from auth.users where lower(email) = public.super_admin_email());

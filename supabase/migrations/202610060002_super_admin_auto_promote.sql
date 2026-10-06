-- Creating the info@imanlogistics.com user (Authentication → Users → Add user)
-- makes it super admin right away; every other new user is still an employee.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    case when lower(coalesce(new.email, '')) = public.super_admin_email() then 'super_admin' else 'employee' end::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

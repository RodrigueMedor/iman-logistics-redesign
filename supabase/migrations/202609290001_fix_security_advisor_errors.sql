-- Repair hosted-database drift reported by the Supabase Security Advisor.
--
-- profiles already has restrictive policies in 202607240001, but RLS was
-- disabled in the hosted project after those policies were created.
alter table if exists public.profiles enable row level security;

-- These legacy views exist in the hosted project but predate the migration
-- history in this repository. Make them obey the querying user's privileges
-- and RLS policies. The conditional blocks keep fresh/local databases valid
-- when the legacy views do not exist.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'cdl_dispatcher_classes_public'
      and c.relkind = 'v'
  ) then
    alter view public.cdl_dispatcher_classes_public
      set (security_invoker = true);
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'cdl_dispatcher_classes_admin'
      and c.relkind = 'v'
  ) then
    alter view public.cdl_dispatcher_classes_admin
      set (security_invoker = true);
  end if;
end
$$;

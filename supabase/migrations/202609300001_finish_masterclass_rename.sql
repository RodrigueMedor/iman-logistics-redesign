-- Finish the freight_broker_* -> freight_dispatch_masterclass_* rename from
-- 202609290002. Renaming a table keeps its constraint and index names, and
-- PL/pgSQL bodies still name the old tables, so databases created before the
-- rename break the back-office dashboard, the registrations list, and the
-- payment -> registration sync. Safe to run on fresh databases too.

do $$
declare
  item record;
begin
  for item in
    select con.conrelid::regclass as table_name, con.conname as old_name,
           replace(replace(con.conname, 'freight_broker_registrations_', 'freight_dispatch_masterclass_registrations_'),
                   'freight_broker_classes_', 'freight_dispatch_masterclass_classes_') as new_name
    from pg_constraint con
    where con.conrelid in ('public.freight_dispatch_masterclass_registrations'::regclass, 'public.freight_dispatch_masterclass_classes'::regclass)
      and (con.conname like 'freight\_broker\_registrations\_%' or con.conname like 'freight\_broker\_classes\_%')
  loop
    if not exists (select 1 from pg_constraint where conrelid = item.table_name and conname = item.new_name) then
      execute format('alter table %s rename constraint %I to %I', item.table_name, item.old_name, item.new_name);
    end if;
  end loop;

  -- Indexes not backing a constraint (renaming a constraint renames its index).
  for item in
    select idx.relname as old_name,
           replace(replace(idx.relname, 'freight_broker_registrations_', 'freight_dispatch_masterclass_registrations_'),
                   'freight_broker_classes_', 'freight_dispatch_masterclass_classes_') as new_name
    from pg_index i
    join pg_class idx on idx.oid = i.indexrelid
    where i.indrelid in ('public.freight_dispatch_masterclass_registrations'::regclass, 'public.freight_dispatch_masterclass_classes'::regclass)
      and (idx.relname like 'freight\_broker\_registrations\_%' or idx.relname like 'freight\_broker\_classes\_%')
  loop
    if to_regclass('public.' || item.new_name) is null then
      execute format('alter index public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end
$$;

create or replace function public.sync_broker_registration_payment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.broker_registration_id is not null and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    update public.freight_dispatch_masterclass_registrations
    set payment_status = new.status,
        payment_id = new.id,
        status = case when new.status = 'paid' then 'CONFIRMED' else status end
    where id = new.broker_registration_id
      -- a later canceled/failed checkout never overrides a completed payment
      and not (payment_status in ('paid', 'refunded') and new.status in ('pending', 'processing', 'failed', 'canceled'));
  end if;
  return new;
end;
$$;


create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_back_office() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'contacts', jsonb_build_object(
      'total', (select count(*) from contact_submissions),
      'new', (select count(*) from contact_submissions where status = 'new'),
      'last7Days', (select count(*) from contact_submissions where created_at >= now() - interval '7 days')
    ),
    'bookings', jsonb_build_object(
      'total', (select count(*) from consultation_bookings),
      'pending', (select count(*) from consultation_bookings where status = 'pending'),
      'upcoming', (select count(*) from consultation_bookings where booking_date >= current_date and status in ('pending', 'confirmed')),
      'unpaid', (select count(*) from consultation_bookings where payment_status = 'unpaid' and status not in ('cancelled', 'no_show'))
    ),
    'applications', jsonb_build_object(
      'total', (select count(*) from job_applications),
      'new', (select count(*) from job_applications where status = 'new'),
      'inProgress', (select count(*) from job_applications where status in ('reviewing', 'interview', 'offer'))
    ),
    'brokerRegistrations', jsonb_build_object(
      'total', (select count(*) from freight_dispatch_masterclass_registrations),
      'confirmed', (select count(*) from freight_dispatch_masterclass_registrations where status = 'CONFIRMED'),
      'awaitingPayment', (select count(*) from freight_dispatch_masterclass_registrations where status = 'SUBMITTED' and payment_status in ('pending', 'processing', 'failed', 'canceled'))
    ),
    'payments', jsonb_build_object(
      'paidCents', (select coalesce(sum(amount_cents), 0) from payments where status = 'paid'),
      'paidLast30DaysCents', (select coalesce(sum(amount_cents), 0) from payments where status = 'paid' and paid_at >= now() - interval '30 days'),
      'pending', (select count(*) from payments where status in ('pending', 'processing'))
    ),
    'shipments', jsonb_build_object(
      'total', (select count(*) from shipments),
      'inTransit', (select count(*) from shipments where status = 'In transit'),
      'exceptions', (select count(*) from shipments where status = 'Exception')
    ),
    'customers', (select count(*) from customers),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', total) order by day), '[]'::jsonb)
      from (
        select d::date as day, (
          (select count(*) from contact_submissions where created_at::date = d::date) +
          (select count(*) from consultation_bookings where created_at::date = d::date) +
          (select count(*) from job_applications where created_at::date = d::date) +
          (select count(*) from freight_dispatch_masterclass_registrations where created_at::date = d::date)
        ) as total
        from generate_series(current_date - 13, current_date, interval '1 day') as d
      ) as days
    )
  ) into result;
  return result;
end;
$$;


-- PostgREST caches foreign-key names for embedded selects.
notify pgrst, 'reload schema';

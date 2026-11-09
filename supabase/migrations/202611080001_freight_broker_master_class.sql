-- Freight Broker Master Class: a second masterclass program that shares the
-- Freight Dispatch Masterclass registration tables, Stripe checkout, payment
-- reminders and back office. Rows are told apart by `program`; every existing
-- row is a Dispatch Masterclass row.
--
-- Note: Stripe payment metadata written before this migration used
-- program = 'freight_broker_masterclass' for Dispatch Masterclass payments (a
-- leftover from the course rename). New payments use the ids below.

alter table public.freight_dispatch_masterclass_classes
  add column if not exists program text not null default 'dispatch_masterclass';
alter table public.freight_dispatch_masterclass_registrations
  add column if not exists program text not null default 'dispatch_masterclass';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'freight_dispatch_masterclass_classes_program_check') then
    alter table public.freight_dispatch_masterclass_classes
      add constraint freight_dispatch_masterclass_classes_program_check check (program in ('dispatch_masterclass', 'broker_masterclass'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'freight_dispatch_masterclass_registrations_program_check') then
    alter table public.freight_dispatch_masterclass_registrations
      add constraint freight_dispatch_masterclass_registrations_program_check check (program in ('dispatch_masterclass', 'broker_masterclass'));
  end if;
end
$$;

create index if not exists freight_dispatch_masterclass_classes_program_idx
  on public.freight_dispatch_masterclass_classes (program, status, starts_at);
create index if not exists freight_dispatch_masterclass_registrations_program_idx
  on public.freight_dispatch_masterclass_registrations (program, created_at desc);

-- A registration always belongs to the program of its class session, so a
-- Broker registration can never be priced or confirmed as a Dispatch one.
create or replace function public.masterclass_registration_program()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare class_program text;
begin
  if new.class_id is not null then
    select program into class_program from public.freight_dispatch_masterclass_classes where id = new.class_id;
    if class_program is not null then new.program := class_program; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists masterclass_registration_program on public.freight_dispatch_masterclass_registrations;
create trigger masterclass_registration_program
  before insert or update of class_id, program on public.freight_dispatch_masterclass_registrations
  for each row execute procedure public.masterclass_registration_program();

-- A session's program is fixed once anyone has registered for it.
create or replace function public.masterclass_class_program_locked()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.program is distinct from old.program
     and exists (select 1 from public.freight_dispatch_masterclass_registrations where class_id = old.id) then
    raise exception 'This class session already has registrations, so its program cannot change.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists masterclass_class_program_locked on public.freight_dispatch_masterclass_classes;
create trigger masterclass_class_program_locked
  before update of program on public.freight_dispatch_masterclass_classes
  for each row execute procedure public.masterclass_class_program_locked();

-- Public "Upcoming sessions", now per program. Called without arguments it
-- still returns the Dispatch Masterclass sessions, as before.
drop function if exists public.freight_broker_open_classes();
drop function if exists public.freight_broker_open_classes(text);
create function public.freight_broker_open_classes(p_program text default 'dispatch_masterclass')
returns table (
  id uuid, name text, description text, price_cents integer, starts_at timestamptz, ends_at timestamptz,
  registration_deadline timestamptz, days_of_week text, class_time text, delivery_mode text, location text,
  instructor_name text, seat_capacity integer, seats_remaining integer, status text, timezone text,
  allows_online boolean, allows_in_person boolean, program text
)
language sql
stable
security definer set search_path = public
as $$
  select c.id, c.name, c.description, c.price_cents, c.starts_at, c.ends_at,
    c.registration_deadline, c.days_of_week, c.class_time, c.delivery_mode, c.location,
    c.instructor_name, c.seat_capacity,
    case when c.seat_capacity is null then null else greatest(c.seat_capacity - (
      select count(*) from public.freight_dispatch_masterclass_registrations r
      where r.class_id = c.id and r.payment_status = 'paid' and r.status <> 'CANCELED'
    ), 0)::int end,
    c.status, c.timezone, c.allows_online, c.allows_in_person, c.program
  from public.freight_dispatch_masterclass_classes c
  where c.status = 'OPEN' and c.ends_at >= now() and c.program = coalesce(p_program, 'dispatch_masterclass')
  order by c.starts_at;
$$;
revoke all on function public.freight_broker_open_classes(text) from public;
grant execute on function public.freight_broker_open_classes(text) to anon, authenticated;

-- The back-office view's c.* is fixed when the view is created; rebuild it so
-- it includes the new program column.
drop view if exists public.freight_dispatch_masterclass_classes_admin;
create view public.freight_dispatch_masterclass_classes_admin with (security_invoker = true) as
select
  c.*,
  coalesce(r.seats_taken, 0)::int as seats_taken,
  case when c.seat_capacity is null then null else greatest(c.seat_capacity - coalesce(r.seats_taken, 0), 0) end as seats_remaining
from public.freight_dispatch_masterclass_classes c
left join (
  select class_id, count(*) as seats_taken
  from public.freight_dispatch_masterclass_registrations
  where payment_status = 'paid' and status <> 'CANCELED'
  group by class_id
) r on r.class_id = c.id;

revoke all on public.freight_dispatch_masterclass_classes_admin from anon, authenticated;
grant select on public.freight_dispatch_masterclass_classes_admin to authenticated;

-- Dashboard: brokerRegistrations stays the Dispatch Masterclass count (its
-- tile links to that board); the Broker Master Class gets its own counts.
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
      'total', (select count(*) from freight_dispatch_masterclass_registrations where program = 'dispatch_masterclass'),
      'confirmed', (select count(*) from freight_dispatch_masterclass_registrations where program = 'dispatch_masterclass' and status = 'CONFIRMED'),
      'awaitingPayment', (select count(*) from freight_dispatch_masterclass_registrations where program = 'dispatch_masterclass' and status = 'SUBMITTED' and payment_status in ('pending', 'processing', 'failed', 'canceled'))
    ),
    'brokerMasterclassRegistrations', jsonb_build_object(
      'total', (select count(*) from freight_dispatch_masterclass_registrations where program = 'broker_masterclass'),
      'confirmed', (select count(*) from freight_dispatch_masterclass_registrations where program = 'broker_masterclass' and status = 'CONFIRMED'),
      'awaitingPayment', (select count(*) from freight_dispatch_masterclass_registrations where program = 'broker_masterclass' and status = 'SUBMITTED' and payment_status in ('pending', 'processing', 'failed', 'canceled'))
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

notify pgrst, 'reload schema';

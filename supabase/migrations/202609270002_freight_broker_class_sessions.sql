-- Freight Broker Masterclass class sessions, matching the live Dispatcher
-- Class Registration (imantruckingschool.com, migration
-- 202609210001_dispatcher_class_sessions): schedule, delivery mode, location,
-- instructor, registration deadline, seats, and an explicit lifecycle status.
--
-- `status` is the source of truth for whether a session takes registrations;
-- `open` is kept in step with it for compatibility.

alter table public.freight_broker_classes
  add column if not exists registration_deadline timestamptz,
  add column if not exists days_of_week text,
  add column if not exists class_time text,
  add column if not exists delivery_mode text,
  add column if not exists instructor_name text,
  add column if not exists status text;

alter table public.freight_broker_classes drop constraint if exists freight_broker_classes_delivery_mode_check;
alter table public.freight_broker_classes add constraint freight_broker_classes_delivery_mode_check
  check (delivery_mode is null or delivery_mode in ('online', 'in_person'));
alter table public.freight_broker_classes drop constraint if exists freight_broker_classes_status_check;
alter table public.freight_broker_classes add constraint freight_broker_classes_status_check
  check (status in ('OPEN', 'FULL', 'CLOSED', 'COMPLETED'));

update public.freight_broker_classes set status = case when open then 'OPEN' else 'CLOSED' end where status is null;
alter table public.freight_broker_classes alter column status set default 'OPEN';
alter table public.freight_broker_classes alter column status set not null;

-- The live sessions have days of week and class time instead of free-form
-- schedule notes.
update public.freight_broker_classes
set days_of_week = coalesce(days_of_week, 'Rolling enrollment'),
    class_time = coalesce(class_time, 'Our team will contact you with your start date'),
    delivery_mode = coalesce(delivery_mode, 'online')
where name = 'Freight Broker Masterclass — Rolling Enrollment 2026';

create or replace function public.sync_freight_broker_class_open()
returns trigger
language plpgsql
as $$
begin
  new.open := new.status = 'OPEN';
  return new;
end;
$$;

drop trigger if exists sync_freight_broker_class_open on public.freight_broker_classes;
create trigger sync_freight_broker_class_open
  before insert or update on public.freight_broker_classes
  for each row execute procedure public.sync_freight_broker_class_open();

-- Views and functions select the columns explicitly, so they are rebuilt
-- before the old column is dropped.
drop view if exists public.freight_broker_classes_admin;
drop function if exists public.freight_broker_open_classes();
alter table public.freight_broker_classes drop column if exists schedule_notes;

create view public.freight_broker_classes_admin with (security_invoker = true) as
select
  c.*,
  coalesce(r.seats_taken, 0)::int as seats_taken,
  case when c.seat_capacity is null then null else greatest(c.seat_capacity - coalesce(r.seats_taken, 0), 0) end as seats_remaining
from public.freight_broker_classes c
left join (
  select class_id, count(*) as seats_taken
  from public.freight_broker_registrations
  where payment_status = 'paid' and status <> 'CANCELED'
  group by class_id
) r on r.class_id = c.id;

revoke all on public.freight_broker_classes_admin from anon, authenticated;
grant select on public.freight_broker_classes_admin to authenticated;

-- Public "Upcoming sessions": OPEN sessions that have not ended. A session
-- whose seats run out keeps status OPEN with seats_remaining = 0, so the page
-- labels it FULL (same as the live view).
create function public.freight_broker_open_classes()
returns table (
  id uuid, name text, description text, price_cents integer, starts_at timestamptz, ends_at timestamptz,
  registration_deadline timestamptz, days_of_week text, class_time text, delivery_mode text, location text,
  instructor_name text, seat_capacity integer, seats_remaining integer, status text
)
language sql
stable
security definer set search_path = public
as $$
  select c.id, c.name, c.description, c.price_cents, c.starts_at, c.ends_at,
    c.registration_deadline, c.days_of_week, c.class_time, c.delivery_mode, c.location,
    c.instructor_name, c.seat_capacity,
    case when c.seat_capacity is null then null else greatest(c.seat_capacity - (
      select count(*) from public.freight_broker_registrations r
      where r.class_id = c.id and r.payment_status = 'paid' and r.status <> 'CANCELED'
    ), 0)::int end,
    c.status
  from public.freight_broker_classes c
  where c.status = 'OPEN' and c.ends_at >= now()
  order by c.starts_at;
$$;

revoke all on function public.freight_broker_open_classes() from public;
grant execute on function public.freight_broker_open_classes() to anon, authenticated;

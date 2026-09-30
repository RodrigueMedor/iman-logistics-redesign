-- Freight Broker Masterclass registration.
--
-- Lift-and-shift of the Iman Trucking School Dispatcher Class Registration
-- (cdl_dispatcher_classes / cdl_dispatcher_registrations, including the
-- schedule/location/seats redesign), adapted to this project: payments go
-- through public.payments and the shared Stripe webhook, and every email/SMS
-- is recorded in public.notification_log.
--
-- Registrations are created only by the API (service role). Staff read and
-- manage them through row-level security.

-- ---------------------------------------------------------------------------
-- Class sessions
-- ---------------------------------------------------------------------------

create table if not exists public.freight_dispatch_masterclass_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  description text,
  price_cents integer not null check (price_cents > 0 and price_cents <= 1000000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  schedule_notes text,
  -- null means unlimited seats
  seat_capacity integer check (seat_capacity is null or seat_capacity >= 0),
  open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

-- ---------------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------------

create table if not exists public.freight_dispatch_masterclass_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_no text not null unique,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 30),
  address_line1 text not null check (char_length(address_line1) <= 200),
  address_line2 text check (address_line2 is null or char_length(address_line2) <= 200),
  city text not null check (char_length(city) <= 120),
  state text not null check (char_length(state) <= 60),
  zip_code text not null check (char_length(zip_code) <= 20),
  class_id uuid references public.freight_dispatch_masterclass_classes(id) on delete set null,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'CONFIRMED', 'CANCELED')),
  payment_status text not null default 'pending' check (payment_status in ('not_required', 'pending', 'processing', 'paid', 'failed', 'canceled', 'refunded')),
  payment_id uuid references public.payments(id) on delete set null,
  payment_policy_version text,
  payment_policy_signature text,
  payment_policy_accepted_at timestamptz,
  staff_notes text not null default '',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freight_dispatch_masterclass_registrations_class_idx on public.freight_dispatch_masterclass_registrations (class_id);
create index if not exists freight_dispatch_masterclass_registrations_email_idx on public.freight_dispatch_masterclass_registrations (lower(email));
create index if not exists freight_dispatch_masterclass_registrations_created_idx on public.freight_dispatch_masterclass_registrations (created_at desc);

-- Link payments to registrations.
alter table public.payments
  add column if not exists broker_registration_id uuid references public.freight_dispatch_masterclass_registrations(id) on delete set null;
create index if not exists payments_broker_registration_idx on public.payments (broker_registration_id);

-- ---------------------------------------------------------------------------
-- Notification log (emails and SMS sent by the API)
-- ---------------------------------------------------------------------------

create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'sms')),
  template text not null,
  recipient text not null,
  subject text not null default '',
  status text not null check (status in ('sent', 'skipped', 'failed')),
  provider text not null default '',
  provider_id text not null default '',
  error text not null default '',
  entity_type text not null default '',
  entity_id text not null default ''
);

create index if not exists notification_log_entity_idx on public.notification_log (entity_type, entity_id);
create index if not exists notification_log_created_idx on public.notification_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Seat availability
-- ---------------------------------------------------------------------------

-- Seats are derived from paid, non-canceled registrations (never decremented
-- by hand), exactly like the dispatcher redesign.
create or replace view public.freight_dispatch_masterclass_classes_admin with (security_invoker = true) as
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

-- Public: open, upcoming classes with seat counts. Runs as owner so it can
-- count registrations, and returns no registration data.
create or replace function public.freight_broker_open_classes()
returns table (
  id uuid, name text, description text, price_cents integer, starts_at timestamptz, ends_at timestamptz,
  location text, schedule_notes text, seat_capacity integer, seats_remaining integer
)
language sql
stable
security definer set search_path = public
as $$
  select c.id, c.name, c.description, c.price_cents, c.starts_at, c.ends_at, c.location, c.schedule_notes, c.seat_capacity,
    case when c.seat_capacity is null then null else greatest(c.seat_capacity - (
      select count(*) from public.freight_dispatch_masterclass_registrations r
      where r.class_id = c.id and r.payment_status = 'paid' and r.status <> 'CANCELED'
    ), 0)::int end
  from public.freight_dispatch_masterclass_classes c
  where c.open = true and c.ends_at >= now()
  order by c.starts_at;
$$;

revoke all on function public.freight_broker_open_classes() from public;
grant execute on function public.freight_broker_open_classes() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Keep the registration in step with its payment (the school's
-- markRelatedRecord): payment status mirrors onto the registration, and a
-- paid registration becomes CONFIRMED.
-- ---------------------------------------------------------------------------

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

drop trigger if exists sync_broker_registration_payment on public.payments;
create trigger sync_broker_registration_payment
  after insert or update on public.payments
  for each row execute procedure public.sync_broker_registration_payment();

do $$
declare table_name text;
begin
  foreach table_name in array array['freight_dispatch_masterclass_classes', 'freight_dispatch_masterclass_registrations'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name);
    execute format('drop trigger if exists audit_row_change on public.%I', table_name);
    execute format('create trigger audit_row_change after insert or update or delete on public.%I for each row execute procedure public.audit_row_change()', table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security and privileges
-- ---------------------------------------------------------------------------

alter table public.freight_dispatch_masterclass_classes enable row level security;
alter table public.freight_dispatch_masterclass_registrations enable row level security;
alter table public.notification_log enable row level security;

drop policy if exists "back office reads" on public.freight_dispatch_masterclass_classes;
create policy "back office reads" on public.freight_dispatch_masterclass_classes for select to authenticated using (public.is_back_office());
drop policy if exists "back office inserts" on public.freight_dispatch_masterclass_classes;
create policy "back office inserts" on public.freight_dispatch_masterclass_classes for insert to authenticated with check (public.is_back_office());
drop policy if exists "back office updates" on public.freight_dispatch_masterclass_classes;
create policy "back office updates" on public.freight_dispatch_masterclass_classes for update to authenticated using (public.is_back_office()) with check (public.is_back_office());
drop policy if exists "super admins delete" on public.freight_dispatch_masterclass_classes;
create policy "super admins delete" on public.freight_dispatch_masterclass_classes for delete to authenticated using (public.is_super_admin());
revoke all on public.freight_dispatch_masterclass_classes from anon, authenticated;
grant select, insert, update, delete on public.freight_dispatch_masterclass_classes to authenticated;
revoke all on public.freight_dispatch_masterclass_classes_admin from anon, authenticated;
grant select on public.freight_dispatch_masterclass_classes_admin to authenticated;

drop policy if exists "back office reads" on public.freight_dispatch_masterclass_registrations;
create policy "back office reads" on public.freight_dispatch_masterclass_registrations for select to authenticated using (public.is_back_office());
drop policy if exists "back office updates" on public.freight_dispatch_masterclass_registrations;
create policy "back office updates" on public.freight_dispatch_masterclass_registrations for update to authenticated using (public.is_back_office()) with check (public.is_back_office());
drop policy if exists "super admins delete" on public.freight_dispatch_masterclass_registrations;
create policy "super admins delete" on public.freight_dispatch_masterclass_registrations for delete to authenticated using (public.is_super_admin());
revoke all on public.freight_dispatch_masterclass_registrations from anon, authenticated;
grant select, delete on public.freight_dispatch_masterclass_registrations to authenticated;
-- Staff change only the review fields; registrant data and payment fields are
-- written by the API and the payment trigger.
grant update (status, staff_notes) on public.freight_dispatch_masterclass_registrations to authenticated;

drop policy if exists "back office reads" on public.notification_log;
create policy "back office reads" on public.notification_log for select to authenticated using (public.is_back_office());
revoke all on public.notification_log from anon, authenticated;
grant select on public.notification_log to authenticated;

-- ---------------------------------------------------------------------------
-- Customers view and dashboard statistics now include registrations
-- ---------------------------------------------------------------------------

drop view if exists public.customers;
create view public.customers with (security_invoker = true) as
select
  lower(activity.email) as email,
  (array_agg(activity.full_name order by activity.created_at desc))[1] as full_name,
  (array_agg(activity.phone order by activity.created_at desc) filter (where activity.phone <> ''))[1] as phone,
  count(*) filter (where activity.kind = 'contact')::int as contact_count,
  count(*) filter (where activity.kind = 'booking')::int as booking_count,
  count(*) filter (where activity.kind = 'application')::int as application_count,
  count(*) filter (where activity.kind = 'registration')::int as registration_count,
  count(*) filter (where activity.kind = 'payment')::int as payment_count,
  coalesce(sum(activity.paid_cents), 0)::bigint as total_paid_cents,
  min(activity.created_at) as first_seen_at,
  max(activity.created_at) as last_seen_at
from (
  select 'contact' as kind, email, full_name, phone, created_at, 0 as paid_cents from public.contact_submissions
  union all
  select 'booking', email, full_name, phone, created_at, 0 from public.consultation_bookings
  union all
  select 'application', email, full_name, phone, created_at, 0 from public.job_applications
  union all
  select 'registration', email, first_name || ' ' || last_name, coalesce(phone, ''), created_at, 0 from public.freight_dispatch_masterclass_registrations
  union all
  select 'payment', payer_email, payer_name, '', created_at, case when status = 'paid' then amount_cents else 0 end
  from public.payments where payer_email <> ''
) as activity
group by lower(activity.email);

revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;

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

-- ---------------------------------------------------------------------------
-- Seed the first class session (price and dates are editable in the back office)
-- ---------------------------------------------------------------------------

insert into public.freight_dispatch_masterclass_classes (name, description, price_cents, starts_at, ends_at, schedule_notes, open)
select 'Freight Dispatch Masterclass — Rolling Enrollment 2026',
       'Step-by-step freight dispatch training: finding loads, carrier setup and paperwork, rate negotiation, compliance, and managing multiple trucks.',
       52000,
       '2026-01-01T00:00:00Z',
       '2026-12-31T23:59:59Z',
       'Rolling enrollment — our team will contact you with your start date.',
       true
where not exists (select 1 from public.freight_dispatch_masterclass_classes where name = 'Freight Dispatch Masterclass — Rolling Enrollment 2026');

-- Point the page's main buttons at the on-page registration, unless staff
-- already changed them in the content editor.
update public.site_content
set button_text = 'Register now', button_url = '#register'
where page = 'freight-broker-masterclass' and section_key in ('hero', 'cta')
  and button_url = 'https://imanfreightbroker.com/';

update public.site_content
set body = 'Review the program here, then register below to reserve your seat.'
where page = 'freight-broker-masterclass' and section_key = 'curriculum'
  and body = 'Review the program here, then continue to the dedicated masterclass website for enrollment details and full access.';

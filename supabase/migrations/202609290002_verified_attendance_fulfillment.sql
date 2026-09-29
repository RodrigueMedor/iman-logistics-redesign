-- Verified registration contacts, student-selected attendance, and durable
-- post-payment fulfillment for the Freight Dispatch Masterclass.

alter table public.freight_broker_classes
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists allows_online boolean not null default true,
  add column if not exists allows_in_person boolean not null default false,
  add column if not exists zoom_join_url text,
  add column if not exists online_instructions text not null default '',
  add column if not exists physical_location text,
  add column if not exists in_person_instructions text not null default '';

update public.freight_broker_classes
set allows_online = delivery_mode is distinct from 'in_person',
    allows_in_person = delivery_mode = 'in_person',
    physical_location = coalesce(physical_location, location)
where zoom_join_url is null
  and online_instructions = ''
  and in_person_instructions = '';

alter table public.freight_broker_classes
  drop constraint if exists freight_broker_classes_attendance_check;
alter table public.freight_broker_classes
  add constraint freight_broker_classes_attendance_check
  check (allows_online or allows_in_person);

create table if not exists public.registration_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text not null,
  email_code_hash text not null,
  phone_code_hash text not null,
  email_expires_at timestamptz not null,
  phone_expires_at timestamptz not null,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  email_send_count integer not null default 1,
  phone_send_count integer not null default 1,
  email_sent_at timestamptz not null default now(),
  phone_sent_at timestamptz not null default now(),
  email_attempt_count integer not null default 0,
  phone_attempt_count integer not null default 0,
  token_hash text,
  token_expires_at timestamptz,
  consumed_at timestamptz,
  locked_until timestamptz,
  request_ip_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_verifications_email_idx
  on public.registration_verifications (lower(email), created_at desc);
create index if not exists registration_verifications_phone_idx
  on public.registration_verifications (phone, created_at desc);

alter table public.registration_verifications enable row level security;
revoke all on public.registration_verifications from anon, authenticated;

alter table public.freight_broker_registrations
  add column if not exists attendance_type text,
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists verification_id uuid references public.registration_verifications(id) on delete set null,
  add column if not exists payment_policy_text text,
  add column if not exists fulfillment_status text not null default 'pending',
  add column if not exists notification_status text not null default 'pending',
  add column if not exists calendar_status text not null default 'pending',
  add column if not exists agreement_status text not null default 'pending',
  add column if not exists fulfillment_error text not null default '';

update public.freight_broker_registrations r
set attendance_type = case when c.delivery_mode = 'in_person' then 'in_person' else 'online' end
from public.freight_broker_classes c
where r.class_id = c.id and r.attendance_type is null;
update public.freight_broker_registrations
set attendance_type = 'online'
where attendance_type is null;

alter table public.freight_broker_registrations
  alter column attendance_type set not null,
  alter column attendance_type set default 'online',
  drop constraint if exists freight_broker_registrations_attendance_check;
alter table public.freight_broker_registrations
  add constraint freight_broker_registrations_attendance_check
  check (attendance_type in ('online', 'in_person'));

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1,
  error text not null default '',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

create table if not exists public.registration_fulfillment_jobs (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.freight_broker_registrations(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  job_type text not null check (job_type in ('student_confirmation', 'student_sms', 'staff_notification', 'staff_sms')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed')),
  attempts integer not null default 0,
  provider_id text not null default '',
  error text not null default '',
  next_attempt_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, payment_id, job_type)
);
create index if not exists registration_fulfillment_jobs_pending_idx
  on public.registration_fulfillment_jobs (status, next_attempt_at);
alter table public.registration_fulfillment_jobs enable row level security;
revoke all on public.registration_fulfillment_jobs from anon, authenticated;

alter table public.notification_log
  add column if not exists idempotency_key text;
create unique index if not exists notification_log_idempotency_idx
  on public.notification_log (idempotency_key);

-- Staff can inspect verification/fulfillment results through the registration
-- and notification screens, but secrets and OTP hashes remain service-only.
grant select on public.registration_fulfillment_jobs to authenticated;
drop policy if exists "back office reads" on public.registration_fulfillment_jobs;
create policy "back office reads" on public.registration_fulfillment_jobs
  for select to authenticated using (public.is_back_office());

-- Rebuild public session data without exposing Zoom links or private
-- attendance instructions.
drop function if exists public.freight_broker_open_classes();
create function public.freight_broker_open_classes()
returns table (
  id uuid, name text, description text, price_cents integer, starts_at timestamptz, ends_at timestamptz,
  registration_deadline timestamptz, days_of_week text, class_time text, delivery_mode text, location text,
  instructor_name text, seat_capacity integer, seats_remaining integer, status text, timezone text,
  allows_online boolean, allows_in_person boolean
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
    c.status, c.timezone, c.allows_online, c.allows_in_person
  from public.freight_broker_classes c
  where c.status = 'OPEN' and c.ends_at >= now()
  order by c.starts_at;
$$;
revoke all on function public.freight_broker_open_classes() from public;
grant execute on function public.freight_broker_open_classes() to anon, authenticated;

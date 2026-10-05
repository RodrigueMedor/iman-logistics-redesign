-- Automated SMS payment reminders for Freight Dispatch Masterclass
-- registrations that were submitted but not paid.
--
-- The API's scheduler (server/src/lib/paymentReminders.ts) claims due rows
-- from payment_reminder_schedules, re-reads the registration, and texts the
-- student through Twilio. The database itself guarantees that a schedule
-- stops as soon as the registration is paid, canceled, or the phone opts out,
-- whatever order the Stripe webhook, Twilio callbacks, and scheduler run in.

-- ---------------------------------------------------------------------------
-- SMS consent captured on the registration form, and opt-out state
-- ---------------------------------------------------------------------------

alter table public.freight_dispatch_masterclass_registrations
  add column if not exists sms_consent_at timestamptz,
  add column if not exists sms_consent_text text,
  add column if not exists sms_opted_out_at timestamptz;

-- One row per phone number (E.164): STOP applies to the number, not to one
-- registration. Rows are kept after START so the history stays visible.
create table if not exists public.sms_opt_outs (
  phone text primary key,
  opted_out boolean not null default true,
  opted_out_at timestamptz,
  opted_in_at timestamptz,
  source text not null default '',
  keyword text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reminder schedule (one per registration) and every reminder sent
-- ---------------------------------------------------------------------------

create table if not exists public.payment_reminder_schedules (
  registration_id uuid primary key references public.freight_dispatch_masterclass_registrations(id) on delete cascade,
  status text not null default 'scheduled' check (status in (
    'scheduled', 'paused', 'stopped_paid', 'stopped_status', 'stopped_opted_out',
    'stopped_no_consent', 'stopped_invalid_phone', 'stopped_class_unavailable', 'stopped_max_reached'
  )),
  reminder_count integer not null default 0,
  last_sent_at timestamptz,
  next_reminder_at timestamptz,
  last_delivery_status text not null default '',
  last_error text not null default '',
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_reminder_schedules_due_idx
  on public.payment_reminder_schedules (next_reminder_at) where next_reminder_at is not null;

create table if not exists public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.freight_dispatch_masterclass_registrations(id) on delete cascade,
  notification_type text not null default 'payment_reminder',
  -- 1 for the first reminder, 2 for the next day's, ...
  attempt_number integer not null check (attempt_number > 0),
  phone text not null,
  body text not null,
  -- Send outcome: sending (API call in flight), retrying (transient error,
  -- will retry), accepted (Twilio took it), failed (gave up), canceled
  -- (became ineligible before sending).
  status text not null default 'sending' check (status in ('sending', 'retrying', 'accepted', 'failed', 'canceled')),
  send_attempts integer not null default 0,
  twilio_message_sid text unique,
  -- Latest Twilio status from the API reply or the status callback
  -- (queued, sent, delivered, undelivered, failed, ...).
  delivery_status text not null default '',
  error_code text not null default '',
  error_message text not null default '',
  sending_started_at timestamptz,
  sent_at timestamptz,
  status_updated_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, notification_type, attempt_number)
);

create index if not exists payment_reminders_registration_idx on public.payment_reminders (registration_id, attempt_number desc);

drop trigger if exists set_updated_at on public.payment_reminders;
create trigger set_updated_at before update on public.payment_reminders for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Guard: a schedule can only stay active while the registration is SUBMITTED,
-- its payment is pending (or a checkout expired/failed), and the phone has
-- not opted out. Runs on every schedule write, including the scheduler's own.
-- ---------------------------------------------------------------------------

create or replace function public.payment_reminder_schedule_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  reg record;
  opted_out boolean;
begin
  select r.status, r.payment_status, r.phone into reg
  from public.freight_dispatch_masterclass_registrations r where r.id = new.registration_id;
  select coalesce(bool_or(o.opted_out), false) into opted_out from public.sms_opt_outs o where o.phone = reg.phone;

  if reg.status is distinct from 'SUBMITTED' or reg.payment_status is distinct from 'pending' then
    if new.next_reminder_at is not null or new.status in ('scheduled', 'paused') then
      new.next_reminder_at := null;
      new.status := case
        when reg.payment_status = 'paid' then 'stopped_paid'
        -- payment in progress: resume if it fails or expires
        when reg.payment_status = 'processing' and reg.status = 'SUBMITTED' then 'paused'
        else 'stopped_status' end;
    end if;
  elsif opted_out then
    new.next_reminder_at := null;
    new.status := 'stopped_opted_out';
  elsif new.status = 'paused' then
    -- The scheduler enforces the 24-hour spacing from last_sent_at.
    new.status := 'scheduled';
    new.next_reminder_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payment_reminder_schedule_guard on public.payment_reminder_schedules;
create trigger payment_reminder_schedule_guard
  before insert or update on public.payment_reminder_schedules
  for each row execute procedure public.payment_reminder_schedule_guard();

-- A registration with SMS consent gets a schedule when it is created. The
-- scheduler applies the configured first-reminder delay, so "now" is only the
-- first time it looks at the registration.
create or replace function public.schedule_registration_payment_reminders()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.sms_consent_at is not null then
      insert into public.payment_reminder_schedules (registration_id, next_reminder_at)
      values (new.id, now()) on conflict (registration_id) do nothing;
    end if;
  else
    -- Status or payment changed: re-run the guard so the schedule stops (or
    -- resumes after a failed/expired checkout) immediately.
    update public.payment_reminder_schedules set updated_at = now() where registration_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_registration_payment_reminders on public.freight_dispatch_masterclass_registrations;
create trigger schedule_registration_payment_reminders
  after insert or update of status, payment_status on public.freight_dispatch_masterclass_registrations
  for each row execute procedure public.schedule_registration_payment_reminders();

-- ---------------------------------------------------------------------------
-- Scheduler claim: due schedules are leased so concurrent workers (several
-- processes, or a restart mid-run) never process the same registration twice.
-- ---------------------------------------------------------------------------

create or replace function public.claim_due_payment_reminders(batch_size integer default 25, lease_seconds integer default 300)
returns setof uuid
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  update public.payment_reminder_schedules s
  set locked_until = now() + make_interval(secs => lease_seconds)
  where s.registration_id in (
    select registration_id from public.payment_reminder_schedules
    where next_reminder_at <= now() and (locked_until is null or locked_until < now())
    order by next_reminder_at
    limit batch_size
    for update skip locked
  )
  returning s.registration_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- STOP / START from Twilio: applied to every registration with that number
-- ---------------------------------------------------------------------------

create or replace function public.record_sms_opt_out(p_phone text, p_source text, p_keyword text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.sms_opt_outs (phone, opted_out, opted_out_at, source, keyword, updated_at)
  values (p_phone, true, now(), p_source, p_keyword, now())
  on conflict (phone) do update set opted_out = true, opted_out_at = now(), source = excluded.source, keyword = excluded.keyword, updated_at = now();
  update public.freight_dispatch_masterclass_registrations set sms_opted_out_at = now()
  where phone = p_phone and sms_opted_out_at is null;
  update public.payment_reminder_schedules s set next_reminder_at = null, status = 'stopped_opted_out'
  from public.freight_dispatch_masterclass_registrations r
  where r.id = s.registration_id and r.phone = p_phone and s.status in ('scheduled', 'paused');
end;
$$;

create or replace function public.record_sms_opt_in(p_phone text, p_source text, p_keyword text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.sms_opt_outs set opted_out = false, opted_in_at = now(), source = p_source, keyword = p_keyword, updated_at = now()
  where phone = p_phone;
  update public.freight_dispatch_masterclass_registrations set sms_opted_out_at = null where phone = p_phone;
  -- The guard stops any that are no longer awaiting payment.
  update public.payment_reminder_schedules s set status = 'scheduled', next_reminder_at = now()
  from public.freight_dispatch_masterclass_registrations r
  where r.id = s.registration_id and r.phone = p_phone and s.status = 'stopped_opted_out';
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security and privileges: staff read; only the API writes.
-- ---------------------------------------------------------------------------

alter table public.sms_opt_outs enable row level security;
alter table public.payment_reminder_schedules enable row level security;
alter table public.payment_reminders enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['sms_opt_outs', 'payment_reminder_schedules', 'payment_reminders'] loop
    execute format('drop policy if exists "back office reads" on public.%I', table_name);
    execute format('create policy "back office reads" on public.%I for select to authenticated using (public.is_back_office())', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end $$;

revoke all on function public.claim_due_payment_reminders(integer, integer) from public, anon, authenticated;
revoke all on function public.record_sms_opt_out(text, text, text) from public, anon, authenticated;
revoke all on function public.record_sms_opt_in(text, text, text) from public, anon, authenticated;
revoke all on function public.payment_reminder_schedule_guard() from public, anon, authenticated;
revoke all on function public.schedule_registration_payment_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_payment_reminders(integer, integer) to service_role;
grant execute on function public.record_sms_opt_out(text, text, text) to service_role;
grant execute on function public.record_sms_opt_in(text, text, text) to service_role;

notify pgrst, 'reload schema';

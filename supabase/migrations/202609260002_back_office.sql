-- Back office: website submissions, bookings, payments, shipments, customers
-- view, dashboard statistics, and audit logging.
--
-- Public website forms never write to these tables directly. They post to
-- Netlify Functions, which validate input and insert with the server-side
-- secret key. Staff read and update records through row-level security.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Roles and helpers
-- ---------------------------------------------------------------------------

-- Super admins and admins can work with back-office records. Role is compared
-- as text so this migration does not depend on the enum value added in 0001
-- being committed first.
create or replace function public.is_back_office()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('super_admin', 'admin') and active = true
  );
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid() and active = true;
$$;

grant execute on function public.is_back_office() to authenticated;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.generate_reference(prefix text)
returns text
language sql
volatile
as $$
  select prefix || '-' || to_char(now(), 'YYMM') || '-' || upper(encode(gen_random_bytes(3), 'hex'));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Staff need to see each other's names (assignees, audit actors).
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_back_office());

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text not null default '',
  actor_role text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  changes jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

drop policy if exists "super admins read audit logs" on public.audit_logs;
create policy "super admins read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_super_admin());

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- Records who changed what. Updates store only the changed fields.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_email text := '';
  actor_role text := '';
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  diff jsonb := '{}'::jsonb;
  field text;
begin
  if actor is not null then
    select p.email, p.role::text into actor_email, actor_role from public.profiles p where p.id = actor;
  end if;
  if actor_role is null or actor_role = '' then
    actor_role := case when coalesce(auth.role(), '') = 'service_role' then 'system' when actor is null then 'public' else 'authenticated' end;
  end if;

  if tg_op = 'UPDATE' then
    for field in select jsonb_object_keys(new_row) loop
      if field <> 'updated_at' and new_row -> field is distinct from old_row -> field then
        diff := diff || jsonb_build_object(field, jsonb_build_object('old', old_row -> field, 'new', new_row -> field));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
  elsif tg_op = 'INSERT' then
    diff := new_row;
  else
    diff := old_row;
  end if;

  insert into public.audit_logs (actor_id, actor_email, actor_role, action, entity_type, entity_id, changes)
  values (actor, coalesce(actor_email, ''), actor_role, lower(tg_op), tg_table_name, coalesce(new_row ->> 'id', old_row ->> 'id', ''), diff);

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Contact submissions
-- ---------------------------------------------------------------------------

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_reference('MSG'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (char_length(phone) <= 30),
  company text not null default '' check (char_length(company) <= 120),
  preferred_method text not null default '',
  service text not null default '',
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  attachment_path text,
  attachment_name text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'archived')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_idx on public.contact_submissions (created_at desc);
create index if not exists contact_submissions_email_idx on public.contact_submissions (lower(email));

-- ---------------------------------------------------------------------------
-- Consultation bookings
-- ---------------------------------------------------------------------------

create table if not exists public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_reference('BKG'),
  service_id text not null,
  service_name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  booking_date date not null,
  booking_time text not null,
  time_zone text not null default '',
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (char_length(phone) <= 30),
  company text not null default '' check (char_length(company) <= 120),
  meeting_type text not null default '',
  message text not null default '' check (char_length(message) <= 5000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded', 'waived')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_bookings_date_idx on public.consultation_bookings (booking_date);
create index if not exists consultation_bookings_email_idx on public.consultation_bookings (lower(email));
-- One active booking per time slot.
create unique index if not exists consultation_bookings_active_slot
  on public.consultation_bookings (booking_date, booking_time)
  where status in ('pending', 'confirmed');

-- Public: which times are taken on a day. Returns no personal data.
create or replace function public.consultation_booked_slots(p_date date)
returns setof text
language sql
stable
security definer set search_path = public
as $$
  select booking_time from public.consultation_bookings
  where booking_date = p_date and status in ('pending', 'confirmed');
$$;

revoke all on function public.consultation_booked_slots(date) from public;
grant execute on function public.consultation_booked_slots(date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Job applications
-- ---------------------------------------------------------------------------

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_reference('APP'),
  position text not null check (char_length(position) between 2 and 120),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (char_length(phone) <= 30),
  location text not null default '' check (char_length(location) <= 120),
  experience text not null default '' check (char_length(experience) <= 120),
  cover_letter text not null default '' check (char_length(cover_letter) <= 5000),
  resume_path text,
  resume_name text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_applications_created_idx on public.job_applications (created_at desc);
create index if not exists job_applications_email_idx on public.job_applications (lower(email));

-- ---------------------------------------------------------------------------
-- Payments (recorded by staff; no payment processor is connected yet)
-- ---------------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_reference('PAY'),
  booking_id uuid references public.consultation_bookings(id) on delete set null,
  payer_name text not null check (char_length(payer_name) between 2 and 120),
  payer_email text not null default '' check (char_length(payer_email) <= 254),
  description text not null default '' check (char_length(description) <= 300),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  method text not null default 'card' check (method in ('card', 'cash', 'check', 'zelle', 'bank_transfer', 'intuit', 'other')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text not null default 'manual',
  provider_reference text not null default '',
  paid_at timestamptz,
  admin_notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_created_idx on public.payments (created_at desc);
create index if not exists payments_booking_idx on public.payments (booking_id);

-- Keep the linked booking's payment status in step with its payments.
create or replace function public.sync_booking_payment_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.booking_id is not null and new.status in ('paid', 'refunded') then
    update public.consultation_bookings
    set payment_status = new.status
    where id = new.booking_id and payment_status is distinct from new.status;
  end if;
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shipments (replaces the browser-only tracking demo)
-- ---------------------------------------------------------------------------

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference = upper(reference) and char_length(reference) between 3 and 40),
  status text not null default 'Pending pickup' check (status in ('Pending pickup', 'In transit', 'Delivered', 'Exception')),
  origin text not null,
  destination text not null,
  estimated_delivery text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  events jsonb not null default '[]'::jsonb,
  customer text not null default '',
  carrier text not null default '',
  internal_notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public tracking lookup. Returns customer-safe fields only.
create or replace function public.track_shipment(p_reference text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'reference', reference,
    'status', status,
    'origin', origin,
    'destination', destination,
    'estimated_delivery', estimated_delivery,
    'progress', progress,
    'events', events,
    'updated_at', updated_at
  )
  from public.shipments
  where reference = upper(trim(p_reference));
$$;

revoke all on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

do $$
declare table_name text;
begin
  foreach table_name in array array['contact_submissions', 'consultation_bookings', 'job_applications', 'payments', 'shipments'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name);
  end loop;
  foreach table_name in array array['contact_submissions', 'consultation_bookings', 'job_applications', 'payments', 'shipments', 'work_orders', 'site_content', 'profiles'] loop
    execute format('drop trigger if exists audit_row_change on public.%I', table_name);
    execute format('create trigger audit_row_change after insert or update or delete on public.%I for each row execute procedure public.audit_row_change()', table_name);
  end loop;
end $$;

drop trigger if exists sync_booking_payment_status on public.payments;
create trigger sync_booking_payment_status
  before insert or update on public.payments
  for each row execute procedure public.sync_booking_payment_status();

-- ---------------------------------------------------------------------------
-- Row-level security and privileges
-- ---------------------------------------------------------------------------

alter table public.contact_submissions enable row level security;
alter table public.consultation_bookings enable row level security;
alter table public.job_applications enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;

-- Submissions: staff read and triage; only super admins delete. Customer-
-- entered fields cannot be edited, only status and internal notes.
do $$
declare table_name text;
begin
  foreach table_name in array array['contact_submissions', 'consultation_bookings', 'job_applications'] loop
    execute format('drop policy if exists "back office reads" on public.%I', table_name);
    execute format('create policy "back office reads" on public.%I for select to authenticated using (public.is_back_office())', table_name);
    execute format('drop policy if exists "back office updates" on public.%I', table_name);
    execute format('create policy "back office updates" on public.%I for update to authenticated using (public.is_back_office()) with check (public.is_back_office())', table_name);
    execute format('drop policy if exists "super admins delete" on public.%I', table_name);
    execute format('create policy "super admins delete" on public.%I for delete to authenticated using (public.is_super_admin())', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

grant update (status, admin_notes) on public.contact_submissions to authenticated;
grant update (status, payment_status, admin_notes) on public.consultation_bookings to authenticated;
grant update (status, admin_notes) on public.job_applications to authenticated;

-- Payments and shipments: staff create and edit; only super admins delete.
do $$
declare table_name text;
begin
  foreach table_name in array array['payments', 'shipments'] loop
    execute format('drop policy if exists "back office reads" on public.%I', table_name);
    execute format('create policy "back office reads" on public.%I for select to authenticated using (public.is_back_office())', table_name);
    execute format('drop policy if exists "back office inserts" on public.%I', table_name);
    execute format('create policy "back office inserts" on public.%I for insert to authenticated with check (public.is_back_office())', table_name);
    execute format('drop policy if exists "back office updates" on public.%I', table_name);
    execute format('create policy "back office updates" on public.%I for update to authenticated using (public.is_back_office()) with check (public.is_back_office())', table_name);
    execute format('drop policy if exists "super admins delete" on public.%I', table_name);
    execute format('create policy "super admins delete" on public.%I for delete to authenticated using (public.is_super_admin())', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Customers: everyone who has contacted, booked, applied, or paid, by email.
-- security_invoker makes the underlying tables' RLS apply to the reader.
-- ---------------------------------------------------------------------------

create or replace view public.customers with (security_invoker = true) as
select
  lower(activity.email) as email,
  (array_agg(activity.full_name order by activity.created_at desc))[1] as full_name,
  (array_agg(activity.phone order by activity.created_at desc) filter (where activity.phone <> ''))[1] as phone,
  count(*) filter (where activity.kind = 'contact')::int as contact_count,
  count(*) filter (where activity.kind = 'booking')::int as booking_count,
  count(*) filter (where activity.kind = 'application')::int as application_count,
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
  select 'payment', payer_email, payer_name, '', created_at, case when status = 'paid' then amount_cents else 0 end
  from public.payments where payer_email <> ''
) as activity
group by lower(activity.email);

revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard statistics
-- ---------------------------------------------------------------------------

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
    'payments', jsonb_build_object(
      'paidCents', (select coalesce(sum(amount_cents), 0) from payments where status = 'paid'),
      'paidLast30DaysCents', (select coalesce(sum(amount_cents), 0) from payments where status = 'paid' and paid_at >= now() - interval '30 days'),
      'pending', (select count(*) from payments where status = 'pending')
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
          (select count(*) from job_applications where created_at::date = d::date)
        ) as total
        from generate_series(current_date - 13, current_date, interval '1 day') as d
      ) as days
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for contact attachments and resumes
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-files', 'submission-files', false, 5242880,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "back office reads submission files" on storage.objects;
create policy "back office reads submission files" on storage.objects
  for select to authenticated
  using (bucket_id = 'submission-files' and public.is_back_office());

drop policy if exists "super admins delete submission files" on storage.objects;
create policy "super admins delete submission files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submission-files' and public.is_super_admin());

-- Limit website-media uploads to reasonably sized raster images.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
where id = 'website-media';

-- ---------------------------------------------------------------------------
-- Work orders: employees may add notes and history entries, not rewrite them
-- ---------------------------------------------------------------------------

create or replace function public.jsonb_array_starts_with(candidate jsonb, prefix jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(candidate) = 'array'
    and jsonb_array_length(candidate) >= jsonb_array_length(prefix)
    and coalesce((
      select jsonb_agg(item.value order by item.position)
      from jsonb_array_elements(candidate) with ordinality as item(value, position)
      where item.position <= jsonb_array_length(prefix)
    ), '[]'::jsonb) = prefix;
$$;

create or replace function public.employee_update_work_order(
  order_id uuid,
  next_status text,
  next_notes jsonb,
  next_history jsonb,
  next_resolution_summary text
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.work_orders;
  updated_order public.work_orders;
begin
  select * into current_order
  from public.work_orders
  where id = order_id and assignee_id = auth.uid();

  if current_order.id is null then
    raise exception 'Work order not found or access denied';
  end if;

  if next_status not in ('Open', 'In progress', 'Blocked', 'Pending approval') then
    raise exception 'Employees cannot set this work-order status';
  end if;

  if next_notes is not null and not public.jsonb_array_starts_with(next_notes, current_order.notes) then
    raise exception 'Existing work-order notes cannot be changed';
  end if;

  if next_history is not null and not public.jsonb_array_starts_with(next_history, current_order.status_history) then
    raise exception 'Existing work-order history cannot be changed';
  end if;

  update public.work_orders
  set
    status = next_status,
    notes = coalesce(next_notes, notes),
    status_history = coalesce(next_history, status_history),
    resolution_summary = coalesce(next_resolution_summary, resolution_summary),
    started_at = case when next_status = 'In progress' then coalesce(started_at, now()) else started_at end,
    blocked_at = case when next_status = 'Blocked' then now() else blocked_at end,
    completion_submitted_at = case when next_status = 'Pending approval' then now() else completion_submitted_at end,
    updated_at = now()
  where id = order_id
  returning * into updated_order;

  return updated_order;
end;
$$;

revoke all on function public.employee_update_work_order(uuid, text, jsonb, jsonb, text) from public;
grant execute on function public.employee_update_work_order(uuid, text, jsonb, jsonb, text) to authenticated;

-- Superseded by employee_update_work_order and not called by the app.
drop function if exists public.update_my_work_order_status(uuid, text);

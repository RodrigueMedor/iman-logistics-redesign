-- Stripe Checkout for consultation bookings, following the Iman Trucking
-- School payment flow: the server creates a pending payment and a Checkout
-- Session, and the signed Stripe webhook is the only thing that marks a
-- Stripe payment paid, failed, canceled, or refunded.

alter table public.payments
  add column if not exists stripe_checkout_session_id text unique,
  add column if not exists stripe_payment_intent_id text unique,
  add column if not exists error_message text not null default '',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists refunded_at timestamptz;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending', 'processing', 'paid', 'failed', 'canceled', 'refunded'));

create index if not exists payments_stripe_session_idx on public.payments (stripe_checkout_session_id);
create index if not exists payments_stripe_intent_idx on public.payments (stripe_payment_intent_id);

alter table public.consultation_bookings drop constraint if exists consultation_bookings_payment_status_check;
alter table public.consultation_bookings add constraint consultation_bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'waived'));

alter table public.consultation_bookings
  add column if not exists payment_policy_version text,
  add column if not exists payment_policy_signature text,
  add column if not exists payment_policy_accepted_at timestamptz;

-- Staff may add notes to Stripe payments, but the amount, status, and Stripe
-- identifiers only change through the webhook (service role) or SQL.
create or replace function public.protect_stripe_payments()
returns trigger
language plpgsql
as $$
begin
  if old.provider = 'stripe' and coalesce(auth.role(), '') = 'authenticated' and (
    new.amount_cents, new.currency, new.status, new.provider, new.provider_reference,
    new.stripe_checkout_session_id, new.stripe_payment_intent_id, new.booking_id, new.paid_at, new.refunded_at
  ) is distinct from (
    old.amount_cents, old.currency, old.status, old.provider, old.provider_reference,
    old.stripe_checkout_session_id, old.stripe_payment_intent_id, old.booking_id, old.paid_at, old.refunded_at
  ) then
    raise exception 'Stripe payments are updated by Stripe. Issue refunds in the Stripe Dashboard.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_stripe_payments on public.payments;
create trigger protect_stripe_payments
  before update on public.payments
  for each row execute procedure public.protect_stripe_payments();

-- Keep the linked booking's payment status in step with its payments. A paid
-- booking that was still pending becomes confirmed.
create or replace function public.sync_booking_payment_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare booking_payment_status text;
begin
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  if new.status = 'refunded' and new.refunded_at is null then
    new.refunded_at := now();
  end if;

  if new.booking_id is not null and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    booking_payment_status := case new.status
      when 'paid' then 'paid'
      when 'refunded' then 'refunded'
      when 'failed' then 'failed'
      when 'canceled' then 'unpaid'
      else 'pending'
    end;
    update public.consultation_bookings
    set payment_status = booking_payment_status,
        status = case when new.status = 'paid' and status = 'pending' then 'confirmed' else status end
    where id = new.booking_id
      and payment_status is distinct from booking_payment_status
      -- a later canceled or failed checkout never overrides a completed payment
      and not (payment_status in ('paid', 'refunded', 'waived') and new.status in ('canceled', 'failed', 'pending', 'processing'));
  end if;
  return new;
end;
$$;

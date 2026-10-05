-- Record an explicit "No" separately from legacy registrations that never
-- presented the SMS reminder choice. A declined choice never schedules SMS.
alter table public.freight_dispatch_masterclass_registrations
  add column if not exists sms_consent_declined_at timestamptz;

comment on column public.freight_dispatch_masterclass_registrations.sms_consent_declined_at is
  'When the registrant explicitly selected No for SMS payment reminders.';

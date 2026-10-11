-- An SMS fulfillment job that can never be sent (Twilio not configured, or no
-- phone on file) is recorded as skipped instead of failed, so it no longer
-- marks the registration's fulfillment as failed or makes the Stripe webhook
-- reply non-2xx (which made Stripe retry the event indefinitely).
alter table public.registration_fulfillment_jobs
  drop constraint if exists registration_fulfillment_jobs_status_check;
alter table public.registration_fulfillment_jobs
  add constraint registration_fulfillment_jobs_status_check
  check (status in ('pending', 'processing', 'succeeded', 'failed', 'skipped'));

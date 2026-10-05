import type { SupabaseClient } from '@supabase/supabase-js'
import { config, databaseConfigured } from '../config'
import { sendSms, twilioConfigured } from './notifications'
import { normalizeVerificationPhone } from './registrationVerification'
import { serviceClient } from './supabase'

// SMS payment reminders for Freight Dispatch Masterclass registrations that
// were submitted but not paid. The schedule lives in payment_reminder_schedules
// (one row per registration, created by a database trigger when the student
// consents to texts); every text sent is a row in payment_reminders.
//
// Each run claims due schedules with a lease, re-reads the registration, and
// sends only while it is SUBMITTED with payment pending (or a checkout that
// failed/expired), the student consented, and the number has not opted out.
// The database guard trigger independently stops schedules on payment, so a
// reminder can never be rescheduled after the registration is paid.
//
// Delivery is at most once per reminder: a send whose outcome is unknown (the
// process died mid-request, or Twilio timed out) is never repeated.

export const PAYMENT_REMINDER_TEXT = 'IMAN Logistics: Your Dispatch Masterclass registration was received, but your payment is still pending. Please complete your payment to secure your registration. Reply STOP to unsubscribe.'
// Payment reminders are only for a submitted registration whose payment is
// currently pending. Failed/canceled checkouts must not cause a reminder: the
// student can start a new checkout, but that is a separate payment flow.
export const REMINDABLE_PAYMENT_STATUSES = ['pending']

const NOTIFICATION_TYPE = 'payment_reminder'
const TEMPLATE = 'freight_broker.payment_reminder_sms'
const ENTITY_TYPE = 'freight_dispatch_masterclass_registrations'
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const BATCH_SIZE = 25
const LEASE_SECONDS = 300
// Tries per reminder for transient Twilio errors, and the wait before each retry.
const MAX_SEND_ATTEMPTS = 3
const RETRY_DELAYS_MINUTES = [5, 15, 45]
// Twilio errors meaning this number cannot get our texts.
// https://www.twilio.com/docs/api/errors
export const OPTED_OUT_ERROR = 21610
export const UNREACHABLE_PHONE_ERRORS = new Set([21211, 21214, 21217, 21401, 21407, 21408, 21612, 21614, 30005, 30006])

const log = (message: string, details: Record<string, unknown> = {}) => console.log(`[payment-reminders] ${message}`, JSON.stringify(details))
const logError = (message: string, error: unknown, details: Record<string, unknown> = {}) => console.error(`[payment-reminders] ${message}`, JSON.stringify(details), error)

export type ReminderSettings = typeof config.paymentReminders

export type ReminderRegistration = {
  id: string
  status: string
  payment_status: string
  phone: string | null
  sms_consent_at: string | null
  sms_opted_out_at: string | null
  submitted_at: string
  class: { status: string; ends_at: string; registration_deadline: string | null; timezone: string | null } | null
}

export type ReminderSchedule = { registration_id: string; status: string; reminder_count: number; last_sent_at: string | null; next_reminder_at: string | null }

type ReminderRow = { id: string; attempt_number: number; status: string; send_attempts: number; sending_started_at: string | null; next_retry_at: string | null }

export type ScheduleStatus = 'paused' | 'stopped_paid' | 'stopped_status' | 'stopped_opted_out' | 'stopped_no_consent' | 'stopped_invalid_phone' | 'stopped_class_unavailable' | 'stopped_max_reached'

export function toE164(phone: string | null | undefined) {
  if (!phone) return null
  try { return normalizeVerificationPhone(phone) } catch { return null }
}

// Why this registration must not get a reminder now, or null when it may.
export function reminderStopReason(reg: ReminderRegistration, schedule: Pick<ReminderSchedule, 'reminder_count'>, optedOut: boolean, now: Date, settings: Pick<ReminderSettings, 'maxReminders'>): ScheduleStatus | null {
  if (reg.payment_status === 'paid') return 'stopped_paid'
  // A payment in progress: the guard trigger resumes the schedule if it fails.
  if (reg.status === 'SUBMITTED' && reg.payment_status === 'processing') return 'paused'
  if (reg.status !== 'SUBMITTED' || !REMINDABLE_PAYMENT_STATUSES.includes(reg.payment_status)) return 'stopped_status'
  if (!reg.sms_consent_at) return 'stopped_no_consent'
  if (optedOut || reg.sms_opted_out_at) return 'stopped_opted_out'
  if (!toE164(reg.phone)) return 'stopped_invalid_phone'
  // Checkout would refuse payment for these, so a reminder would not help.
  const session = reg.class
  if (!session || session.status !== 'OPEN' || new Date(session.ends_at) <= now || (session.registration_deadline && new Date(session.registration_deadline) <= now)) return 'stopped_class_unavailable'
  if (settings.maxReminders > 0 && schedule.reminder_count >= settings.maxReminders) return 'stopped_max_reached'
  return null
}

// First reminder a set delay after registering; then at least intervalHours
// after the last reminder Twilio accepted.
export function earliestSendTime(reg: Pick<ReminderRegistration, 'submitted_at'>, schedule: Pick<ReminderSchedule, 'last_sent_at'>, settings: Pick<ReminderSettings, 'firstDelayMinutes' | 'intervalHours'>) {
  const first = new Date(reg.submitted_at).getTime() + settings.firstDelayMinutes * MINUTE
  const spaced = schedule.last_sent_at ? new Date(schedule.last_sent_at).getTime() + settings.intervalHours * HOUR : 0
  return new Date(Math.max(first, spaced))
}

// "9-20" → [9, 20]. "off" or "0-24" disables the window.
export function parseSendWindow(value: string): [number, number] | null {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value.trim())
  if (!match) return null
  const [start, end] = [Number(match[1]), Number(match[2])]
  if (start >= end || end > 24 || (start === 0 && end === 24)) return null
  return [start, end]
}

// When the send window next opens in the given timezone, or null if it is open now.
export function nextWindowOpening(now: Date, timeZone: string, window: [number, number] | null) {
  if (!window) return null
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  }
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  const minute = Number(parts.find(part => part.type === 'minute')?.value)
  const [start, end] = window
  if (hour >= start && hour < end) return null
  const hoursUntil = hour < start ? start - hour : 24 - hour + start
  return new Date(now.getTime() + hoursUntil * HOUR - minute * MINUTE - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds())
}

export const retryDelayMinutes = (sendAttempts: number) => RETRY_DELAYS_MINUTES[Math.min(Math.max(sendAttempts, 1), RETRY_DELAYS_MINUTES.length) - 1]

const statusCallbackUrl = () => config.twilio.webhookBaseUrl.startsWith('https://') ? `${config.twilio.webhookBaseUrl}/api/twilio/status` : undefined
const idempotencyKey = (registrationId: string, attempt: number) => `registration:${registrationId}:${NOTIFICATION_TYPE}:${attempt}`

async function loadRegistration(db: SupabaseClient, id: string) {
  const { data, error } = await db.from('freight_dispatch_masterclass_registrations')
    .select('id, status, payment_status, phone, sms_consent_at, sms_opted_out_at, submitted_at, class:freight_dispatch_masterclass_classes(status, ends_at, registration_deadline, timezone)')
    .eq('id', id).maybeSingle()
  if (error) throw error
  return data as ReminderRegistration | null
}

async function isOptedOut(db: SupabaseClient, phone: string | null) {
  if (!phone) return false
  const { data, error } = await db.from('sms_opt_outs').select('opted_out').eq('phone', phone).maybeSingle()
  if (error) throw error
  return Boolean(data?.opted_out)
}

async function updateSchedule(db: SupabaseClient, registrationId: string, changes: Record<string, unknown>) {
  // The guard trigger overrides these if the registration was paid meanwhile.
  const { error } = await db.from('payment_reminder_schedules').update({ ...changes, locked_until: null }).eq('registration_id', registrationId)
  if (error) throw error
}

async function updateReminder(db: SupabaseClient, id: string, changes: Record<string, unknown>) {
  const { error } = await db.from('payment_reminders').update(changes).eq('id', id)
  if (error) throw error
}

export type ReminderOutcome = 'sent' | 'stopped' | 'deferred' | 'retrying' | 'failed' | 'skipped'

// Processes one claimed schedule. Every path releases the lease.
export async function processPaymentReminder(db: SupabaseClient, registrationId: string, now = new Date(), settings: ReminderSettings = config.paymentReminders): Promise<ReminderOutcome> {
  const [reg, { data: schedule, error: scheduleError }, { data: latestRows, error: latestError }] = await Promise.all([
    loadRegistration(db, registrationId),
    db.from('payment_reminder_schedules').select('*').eq('registration_id', registrationId).maybeSingle(),
    db.from('payment_reminders').select('id, attempt_number, status, send_attempts, sending_started_at, next_retry_at').eq('registration_id', registrationId).eq('notification_type', NOTIFICATION_TYPE).order('attempt_number', { ascending: false }).limit(1),
  ])
  if (scheduleError) throw scheduleError
  if (latestError) throw latestError
  if (!reg || !schedule) return 'skipped'
  let current = schedule as ReminderSchedule
  const latest = (latestRows?.[0] ?? null) as ReminderRow | null

  // A previous run died between starting the Twilio request and recording
  // the result. If the notification log shows Twilio accepted it, record
  // that; otherwise mark it unknown and never resend it.
  if (latest?.status === 'sending') {
    const { data: logged } = await db.from('notification_log').select('provider_id, created_at').eq('idempotency_key', idempotencyKey(registrationId, latest.attempt_number)).eq('status', 'sent').maybeSingle()
    const startedAt = latest.sending_started_at ?? now.toISOString()
    if (logged) {
      await updateReminder(db, latest.id, { status: 'accepted', twilio_message_sid: logged.provider_id || null, delivery_status: 'queued', sent_at: logged.created_at, status_updated_at: now.toISOString() })
      current = { ...current, reminder_count: current.reminder_count + 1, last_sent_at: logged.created_at }
      await updateSchedule(db, registrationId, { reminder_count: current.reminder_count, last_sent_at: current.last_sent_at, last_delivery_status: 'queued', last_error: '' })
    } else {
      await updateReminder(db, latest.id, { status: 'failed', error_message: 'Send outcome unknown (interrupted while sending); not resent to avoid a duplicate text.', status_updated_at: now.toISOString() })
      current = { ...current, last_sent_at: startedAt }
    }
    log('recovered an interrupted send', { registrationId, attempt: latest.attempt_number, accepted: Boolean(logged) })
  }

  const phone = toE164(reg.phone)
  const stop = reminderStopReason(reg, current, await isOptedOut(db, phone), now, settings)
  if (stop) {
    if (latest?.status === 'retrying') await updateReminder(db, latest.id, { status: 'canceled', next_retry_at: null })
    await updateSchedule(db, registrationId, { status: stop, next_reminder_at: null })
    log('schedule stopped', { registrationId, reason: stop })
    return 'stopped'
  }

  const retrying = latest?.status === 'retrying' ? latest : null
  const earliest = earliestSendTime(reg, current, settings)
  const due = new Date(Math.max(earliest.getTime(), retrying?.next_retry_at ? new Date(retrying.next_retry_at).getTime() : 0))
  if (due > now) {
    await updateSchedule(db, registrationId, { status: 'scheduled', next_reminder_at: due.toISOString() })
    return 'deferred'
  }
  const opening = nextWindowOpening(now, reg.class?.timezone || 'America/New_York', parseSendWindow(settings.sendWindow))
  if (opening) {
    await updateSchedule(db, registrationId, { status: 'scheduled', next_reminder_at: opening.toISOString() })
    return 'deferred'
  }

  // Query the latest status once more immediately before texting.
  const fresh = await loadRegistration(db, registrationId)
  const freshStop = fresh ? reminderStopReason(fresh, current, await isOptedOut(db, phone), now, settings) : 'stopped_status'
  if (freshStop) {
    if (retrying) await updateReminder(db, retrying.id, { status: 'canceled', next_retry_at: null })
    await updateSchedule(db, registrationId, { status: freshStop, next_reminder_at: null })
    log('schedule stopped just before sending', { registrationId, reason: freshStop })
    return 'stopped'
  }

  const attempt = retrying?.attempt_number ?? (latest?.attempt_number ?? 0) + 1
  const sendAttempts = (retrying?.send_attempts ?? 0) + 1
  const sending = { status: 'sending', send_attempts: sendAttempts, sending_started_at: now.toISOString(), next_retry_at: null, phone: phone!, body: PAYMENT_REMINDER_TEXT }
  let reminderId: string
  if (retrying) {
    reminderId = retrying.id
    await updateReminder(db, reminderId, sending)
  } else {
    const { data: inserted, error } = await db.from('payment_reminders').insert({ registration_id: registrationId, notification_type: NOTIFICATION_TYPE, attempt_number: attempt, ...sending }).select('id').single()
    if (error?.code === '23505') {
      // Another worker already owns this reminder.
      await updateSchedule(db, registrationId, {})
      return 'skipped'
    }
    if (error) throw error
    reminderId = inserted.id
  }

  const delivery = await sendSms({ entityType: ENTITY_TYPE, entityId: registrationId, template: TEMPLATE, to: phone, body: PAYMENT_REMINDER_TEXT, idempotencyKey: idempotencyKey(registrationId, attempt), statusCallback: statusCallbackUrl() })
  const at = new Date().toISOString()

  if (delivery.status === 'sent') {
    const count = current.reminder_count + 1
    const reachedMax = settings.maxReminders > 0 && count >= settings.maxReminders
    await updateReminder(db, reminderId, { status: 'accepted', twilio_message_sid: delivery.providerId || null, delivery_status: delivery.providerStatus || 'queued', sent_at: at, status_updated_at: at, error_code: '', error_message: '' })
    await updateSchedule(db, registrationId, {
      status: reachedMax ? 'stopped_max_reached' : 'scheduled', reminder_count: count, last_sent_at: at,
      next_reminder_at: reachedMax ? null : new Date(Date.parse(at) + settings.intervalHours * HOUR).toISOString(),
      last_delivery_status: delivery.providerStatus || 'queued', last_error: '',
    })
    log('reminder sent', { registrationId, attempt, sid: delivery.providerId })
    return 'sent'
  }

  const errorCode = delivery.errorCode ? String(delivery.errorCode) : ''
  const errorMessage = delivery.error || 'SMS was not sent'
  if (delivery.errorCode === OPTED_OUT_ERROR) {
    await updateReminder(db, reminderId, { status: 'failed', error_code: errorCode, error_message: errorMessage, status_updated_at: at })
    const { error } = await db.rpc('record_sms_opt_out', { p_phone: phone, p_source: 'twilio_error_21610', p_keyword: '' })
    if (error) throw error
    await updateSchedule(db, registrationId, { status: 'stopped_opted_out', next_reminder_at: null, last_error: errorMessage })
    log('recipient has opted out at Twilio', { registrationId })
    return 'stopped'
  }
  if (delivery.errorCode && UNREACHABLE_PHONE_ERRORS.has(delivery.errorCode)) {
    await updateReminder(db, reminderId, { status: 'failed', error_code: errorCode, error_message: errorMessage, status_updated_at: at })
    await updateSchedule(db, registrationId, { status: 'stopped_invalid_phone', next_reminder_at: null, last_error: errorMessage })
    log('phone cannot receive SMS', { registrationId, errorCode })
    return 'stopped'
  }
  if (delivery.retryable && sendAttempts < MAX_SEND_ATTEMPTS) {
    const retryAt = new Date(Date.parse(at) + retryDelayMinutes(sendAttempts) * MINUTE).toISOString()
    await updateReminder(db, reminderId, { status: 'retrying', error_code: errorCode, error_message: errorMessage, next_retry_at: retryAt, status_updated_at: at })
    await updateSchedule(db, registrationId, { status: 'scheduled', next_reminder_at: retryAt, last_error: errorMessage })
    log('send failed, will retry', { registrationId, attempt, sendAttempts, retryAt, errorCode })
    return 'retrying'
  }
  // Gave up on this reminder; try again at the next interval.
  await updateReminder(db, reminderId, { status: 'failed', error_code: errorCode, error_message: errorMessage, status_updated_at: at })
  await updateSchedule(db, registrationId, { status: 'scheduled', next_reminder_at: new Date(Date.parse(at) + settings.intervalHours * HOUR).toISOString(), last_error: errorMessage })
  log('send failed', { registrationId, attempt, sendAttempts, errorCode, error: errorMessage })
  return 'failed'
}

export async function runPaymentReminders(db: SupabaseClient = serviceClient()) {
  const totals: Record<ReminderOutcome, number> & { claimed: number; errors: number } = { claimed: 0, errors: 0, sent: 0, stopped: 0, deferred: 0, retrying: 0, failed: 0, skipped: 0 }
  if (!twilioConfigured()) return totals
  for (let batch = 0; batch < 20; batch += 1) {
    const { data, error } = await db.rpc('claim_due_payment_reminders', { batch_size: BATCH_SIZE, lease_seconds: LEASE_SECONDS })
    if (error) throw error
    const ids = (data ?? []) as string[]
    totals.claimed += ids.length
    for (const id of ids) {
      try {
        totals[await processPaymentReminder(db, id)] += 1
      } catch (caught) {
        totals.errors += 1
        logError('could not process reminder', caught, { registrationId: id })
        // Leave the lease to expire so the next run retries in a few minutes.
      }
    }
    if (ids.length < BATCH_SIZE) break
  }
  return totals
}

// Runs in the API process on production (pm2/Hostinger); independent of
// anyone having the back office open. Safe with several processes: each
// schedule is leased by the database before it is processed.
export function startPaymentReminderScheduler() {
  const settings = config.paymentReminders
  if (!settings.enabled) return log('scheduler disabled (PAYMENT_REMINDERS_ENABLED=false)')
  if (!databaseConfigured() || !twilioConfigured()) return log('scheduler not started: the database or Twilio is not configured')
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const totals = await runPaymentReminders()
      if (totals.claimed) log('run finished', totals)
    } catch (caught) {
      logError('run failed', caught)
    } finally {
      running = false
    }
  }
  const pollMs = Math.max(30, settings.pollSeconds) * 1000
  setInterval(() => void tick(), pollMs)
  setTimeout(() => void tick(), 10_000)
  log('scheduler started', { everySeconds: pollMs / 1000, firstDelayMinutes: settings.firstDelayMinutes, intervalHours: settings.intervalHours, maxReminders: settings.maxReminders, sendWindow: settings.sendWindow })
}

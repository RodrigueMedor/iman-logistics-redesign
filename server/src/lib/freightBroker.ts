import type { SupabaseClient } from '@supabase/supabase-js'
import { FREIGHT_BROKER_POLICY_TEXT, FREIGHT_BROKER_PROGRAM } from '../../../src/features/freightBroker/program'
import { config } from '../config'
import { escapeHtml, sendEmail, sendSms } from './notifications'

// Freight Dispatch Masterclass registration helpers, adapted from the dispatcher
// registration in the Iman Trucking School server (server-express.js).

const registrationSelect = '*, class:freight_dispatch_masterclass_classes(id, name, status, starts_at, ends_at, registration_deadline, days_of_week, class_time, delivery_mode, location, instructor_name, price_cents, timezone, allows_online, allows_in_person, zoom_join_url, online_instructions, physical_location, in_person_instructions)'

export type RegistrationRow = {
  id: string
  registration_no: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  status: string
  payment_status: string
  payment_policy_signature: string | null
  payment_policy_accepted_at: string | null
  payment_policy_version: string | null
  payment_policy_text: string | null
  attendance_type: 'online' | 'in_person'
  email_verified_at: string | null
  phone_verified_at: string | null
  class: { id: string; name: string; status: string; starts_at: string; ends_at: string; registration_deadline: string | null; days_of_week: string | null; class_time: string | null; delivery_mode: 'online' | 'in_person' | null; location: string | null; instructor_name: string | null; price_cents: number; timezone: string; allows_online: boolean; allows_in_person: boolean; zoom_join_url: string | null; online_instructions: string; physical_location: string | null; in_person_instructions: string } | null
}

export function makeRegistrationNo() {
  const stamp = Date.now().toString(36).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${FREIGHT_BROKER_PROGRAM.registrationPrefix}-${new Date().getFullYear()}-${stamp}${suffix}`
}

export async function loadRegistration(db: SupabaseClient, id: string) {
  const { data } = await db.from('freight_dispatch_masterclass_registrations').select(registrationSelect).eq('id', id).maybeSingle()
  return data as RegistrationRow | null
}

// Seats are enforced at the moment of payment, like the dispatcher redesign.
export async function classIsFull(db: SupabaseClient, classId: string) {
  const { data: row } = await db.from('freight_dispatch_masterclass_classes').select('seat_capacity').eq('id', classId).maybeSingle()
  if (row?.seat_capacity == null) return false
  const { count } = await db.from('freight_dispatch_masterclass_registrations').select('id', { count: 'exact', head: true })
    .eq('class_id', classId).eq('payment_status', 'paid').neq('status', 'CANCELED')
  return (count ?? 0) >= row.seat_capacity
}

// The confirmation page's view of a registration (the school's
// PaymentRegistrationDetails, with the class fields added by the redesign).
export function registrationDetails(row: RegistrationRow) {
  return {
    id: row.id,
    registrationNo: row.registration_no,
    program: FREIGHT_BROKER_PROGRAM.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    address: `${row.address_line1}${row.address_line2 ? `, ${row.address_line2}` : ''}`,
    city: row.city,
    state: row.state,
    zip: row.zip_code,
    className: row.class?.name || FREIGHT_BROKER_PROGRAM.defaultClassName,
    classStartsAt: row.class?.starts_at ?? null,
    classEndsAt: row.class?.ends_at ?? null,
    classDaysOfWeek: row.class?.days_of_week ?? null,
    classTime: row.class?.class_time ?? null,
    classDeliveryMode: row.class?.delivery_mode ?? null,
    classLocation: row.class?.location ?? null,
    classInstructor: row.class?.instructor_name ?? null,
    classTimezone: row.class?.timezone ?? 'America/New_York',
    attendanceType: row.attendance_type,
    emailVerified: Boolean(row.email_verified_at),
    phoneVerified: Boolean(row.phone_verified_at),
    status: row.status,
    paymentStatus: row.payment_status,
    policyAccepted: Boolean(row.payment_policy_accepted_at),
    policySignature: row.payment_policy_signature,
    policyAcceptedAt: row.payment_policy_accepted_at,
    policyVersion: row.payment_policy_version,
    policyText: FREIGHT_BROKER_POLICY_TEXT,
  }
}

type PaidPayment = { id: string; amount_cents: number; paid_at: string | null; stripe_payment_intent_id: string | null; stripe_checkout_session_id: string | null }

// Same content as the live school's payment notifications
// (buildNotificationContext / paymentNotificationEmailHtml / SMS text).
function notificationContext(row: RegistrationRow, payment: PaidPayment) {
  return {
    firstName: row.first_name,
    name: `${row.first_name} ${row.last_name}`.trim() || 'Customer',
    amount: `$${(payment.amount_cents / 100).toFixed(2)}`,
    program: row.class?.name || FREIGHT_BROKER_PROGRAM.defaultClassName,
    registrationNo: row.registration_no,
    transactionId: payment.stripe_payment_intent_id || payment.stripe_checkout_session_id || payment.id,
    date: new Date(payment.paid_at || Date.now()).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/New_York' }),
    status: 'Paid',
    attendance: row.attendance_type === 'online' ? 'Online / Zoom' : 'In Person',
    startsAt: row.class?.starts_at || '',
    endsAt: row.class?.ends_at || '',
    timezone: row.class?.timezone || 'America/New_York',
    attendanceDetails: row.attendance_type === 'online'
      ? row.class?.zoom_join_url || 'Zoom details will be provided by Iman Logistics.'
      : row.class?.physical_location || row.class?.location || 'Location details will be provided by Iman Logistics.',
    instructions: row.attendance_type === 'online' ? row.class?.online_instructions || '' : row.class?.in_person_instructions || '',
  }
}

type Context = ReturnType<typeof notificationContext>

function paymentEmailHtml(ctx: Context, forAdmin: boolean) {
  const line = (label: string, value: string, first = false) => `<p style="margin: ${first ? '0' : '8px 0 0 0'};"><strong>${label}:</strong> ${escapeHtml(value)}</p>`
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0A005A;">${forAdmin ? 'New Payment Received' : 'Payment Confirmation'}</h2>
      <p>${forAdmin ? `A payment was received from <strong>${escapeHtml(ctx.name)}</strong>.` : `Dear ${escapeHtml(ctx.firstName || 'Student')}, thank you for your payment to Iman Logistics.`}</p>
      <div style="background: #f5f7fb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${line('Name', ctx.name, true)}
        ${line('Program/Class', ctx.program)}
        ${line('Amount', ctx.amount)}
        ${line('Payment Status', ctx.status)}
        ${line('Transaction ID', ctx.transactionId)}
        ${line('Date', ctx.date)}
        ${line('Registration Number', ctx.registrationNo)}
        ${line('Attendance', ctx.attendance)}
        ${ctx.startsAt ? line('Class starts', new Date(ctx.startsAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: ctx.timezone })) : ''}
        ${line(ctx.attendance === 'Online / Zoom' ? 'Zoom information' : 'Class location', ctx.attendanceDetails)}
        ${ctx.instructions ? line('Instructions', ctx.instructions) : ''}
      </div>
      ${forAdmin ? `<p>Review this registration in the <a href="${new URL('/admin/dispatch-masterclass/', config.appUrl)}">back office</a>.</p>` : ''}
      <p>Best regards,<br>Iman Logistics</p>
    </div>`
}

const icsEscape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const icsDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
function calendarInvite(row: RegistrationRow, ctx: Context) {
  const location = row.attendance_type === 'online' ? ctx.attendanceDetails : (row.class?.physical_location || row.class?.location || '')
  const description = [FREIGHT_BROKER_PROGRAM.name, `Registration ${row.registration_no}`, ctx.attendance, ctx.attendanceDetails, ctx.instructions].filter(Boolean).join('\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Iman Logistics//Freight Dispatch Masterclass//EN', 'METHOD:REQUEST',
    'BEGIN:VEVENT', `UID:${row.id}@imanlogistics.com`, `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(row.class?.starts_at || new Date().toISOString())}`, `DTEND:${icsDate(row.class?.ends_at || row.class?.starts_at || new Date().toISOString())}`,
    `SUMMARY:${icsEscape(row.class?.name || FREIGHT_BROKER_PROGRAM.name)}`, `DESCRIPTION:${icsEscape(description)}`, `LOCATION:${icsEscape(location)}`,
    'STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

function signedAgreement(row: RegistrationRow) {
  const policy = row.payment_policy_text || FREIGHT_BROKER_POLICY_TEXT
  return `<!doctype html><html><head><meta charset="utf-8"><title>Signed registration agreement</title></head><body style="font-family:Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.6"><h1>Freight Dispatch Masterclass Registration Agreement</h1><p><strong>Registration:</strong> ${escapeHtml(row.registration_no)}</p><p><strong>Student:</strong> ${escapeHtml(`${row.first_name} ${row.last_name}`)}</p><p><strong>Attendance:</strong> ${escapeHtml(row.attendance_type === 'online' ? 'Online / Zoom' : 'In Person')}</p><h2>Policy</h2><p>${escapeHtml(policy)}</p><hr><p><strong>Electronically signed by:</strong> ${escapeHtml(row.payment_policy_signature || '')}</p><p><strong>Accepted at:</strong> ${escapeHtml(row.payment_policy_accepted_at || '')}</p><p><strong>Policy version:</strong> ${escapeHtml(row.payment_policy_version || '')}</p></body></html>`
}

const smsText = (ctx: Context, forAdmin: boolean) => forAdmin
  ? `Iman Logistics: payment received from ${ctx.name} for ${ctx.program}, ${ctx.amount}. Txn ${ctx.transactionId}.`
  : `Iman Logistics: your payment of ${ctx.amount} for ${ctx.program} was received. Thank you, ${ctx.firstName || 'there'}!`

// Sent once a registration payment is confirmed: registrant email and SMS,
// staff email, and staff SMS when a staff phone is configured. Each is
// independent, so one failing never blocks the others or the payment.
export async function sendRegistrationPaidNotifications(db: SupabaseClient, registrationId: string, payment: PaidPayment) {
  const row = await loadRegistration(db, registrationId)
  if (!row) return
  const entity = { entityType: 'freight_dispatch_masterclass_registrations', entityId: row.id }
  const ctx = notificationContext(row, payment)
  const jobTypes = ['student_confirmation', 'student_sms', 'staff_notification', ...(config.freightBrokerNotifyPhone ? ['staff_sms'] : [])]
  await db.from('registration_fulfillment_jobs').upsert(jobTypes.map(jobType => ({ registration_id: row.id, payment_id: payment.id, job_type: jobType })), { onConflict: 'registration_id,payment_id,job_type', ignoreDuplicates: true })
  const { data: jobs, error } = await db.from('registration_fulfillment_jobs').select('*').eq('registration_id', row.id).eq('payment_id', payment.id).neq('status', 'succeeded')
  if (error) throw error
  const failures: string[] = []
  for (const job of jobs ?? []) {
    const { data: claimed } = await db.from('registration_fulfillment_jobs').update({ status: 'processing', attempts: Number(job.attempts) + 1, started_at: new Date().toISOString(), error: '' })
      .eq('id', job.id).in('status', ['pending', 'failed']).select('id').maybeSingle()
    if (!claimed) continue
    const key = `registration:${row.id}:payment:${payment.id}:${job.job_type}`
    let delivery
    if (job.job_type === 'student_confirmation') {
      delivery = await sendEmail({
        ...entity, template: 'freight_broker.payment_confirmed', idempotencyKey: key, from: config.freightBrokerEmailFrom, to: row.email,
        subject: `Registration & Payment Confirmed - ${ctx.registrationNo}`, html: paymentEmailHtml(ctx, false),
        attachments: [
          { filename: `${ctx.registrationNo}-calendar.ics`, content: Buffer.from(calendarInvite(row, ctx)) },
          { filename: `${ctx.registrationNo}-signed-agreement.html`, content: Buffer.from(signedAgreement(row)) },
        ],
      })
    } else if (job.job_type === 'staff_notification') {
      delivery = await sendEmail({ ...entity, template: 'freight_broker.payment_received_staff', idempotencyKey: key, from: config.freightBrokerEmailFrom, to: config.freightBrokerNotifyEmail, subject: `New payment received - ${ctx.program}`, html: paymentEmailHtml(ctx, true) })
    } else if (job.job_type === 'student_sms') {
      delivery = await sendSms({ ...entity, template: 'freight_broker.payment_confirmed_sms', idempotencyKey: key, to: row.phone, body: smsText(ctx, false) })
    } else {
      delivery = await sendSms({ ...entity, template: 'freight_broker.payment_received_staff_sms', idempotencyKey: key, to: config.freightBrokerNotifyPhone, body: smsText(ctx, true) })
    }
    const succeeded = delivery.status === 'sent'
    await db.from('registration_fulfillment_jobs').update({ status: succeeded ? 'succeeded' : 'failed', provider_id: delivery.providerId || '', error: delivery.error || '', completed_at: succeeded ? new Date().toISOString() : null, next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }).eq('id', job.id)
    if (!succeeded) failures.push(`${job.job_type}: ${delivery.error || delivery.status}`)
    if (job.job_type === 'student_confirmation') await db.from('freight_dispatch_masterclass_registrations').update({ notification_status: succeeded ? 'sent' : 'failed', calendar_status: succeeded ? 'sent' : 'failed', agreement_status: succeeded ? 'sent' : 'failed' }).eq('id', row.id)
  }
  const { count: remaining } = await db.from('registration_fulfillment_jobs').select('id', { count: 'exact', head: true }).eq('registration_id', row.id).eq('payment_id', payment.id).neq('status', 'succeeded')
  await db.from('freight_dispatch_masterclass_registrations').update({ fulfillment_status: remaining ? 'failed' : 'completed', fulfillment_error: failures.join('; ') }).eq('id', row.id)
  if (failures.length) throw new Error(`Registration fulfillment incomplete: ${failures.join('; ')}`)
}

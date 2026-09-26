import type { SupabaseClient } from '@supabase/supabase-js'
import { FREIGHT_BROKER_POLICY_TEXT, FREIGHT_BROKER_PROGRAM } from '../../../src/features/freightBroker/program'
import { config } from '../config'
import { escapeHtml, sendEmail, sendSms } from './notifications'

// Freight Broker Masterclass registration helpers, adapted from the dispatcher
// registration in the Iman Trucking School server (server-express.js).

const registrationSelect = '*, class:freight_broker_classes(id, name, status, starts_at, ends_at, registration_deadline, days_of_week, class_time, delivery_mode, location, instructor_name, price_cents)'

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
  class: { id: string; name: string; status: string; starts_at: string; ends_at: string; registration_deadline: string | null; days_of_week: string | null; class_time: string | null; delivery_mode: 'online' | 'in_person' | null; location: string | null; instructor_name: string | null; price_cents: number } | null
}

export function makeRegistrationNo() {
  const stamp = Date.now().toString(36).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${FREIGHT_BROKER_PROGRAM.registrationPrefix}-${new Date().getFullYear()}-${stamp}${suffix}`
}

export async function loadRegistration(db: SupabaseClient, id: string) {
  const { data } = await db.from('freight_broker_registrations').select(registrationSelect).eq('id', id).maybeSingle()
  return data as RegistrationRow | null
}

// Seats are enforced at the moment of payment, like the dispatcher redesign.
export async function classIsFull(db: SupabaseClient, classId: string) {
  const { data: row } = await db.from('freight_broker_classes').select('seat_capacity').eq('id', classId).maybeSingle()
  if (row?.seat_capacity == null) return false
  const { count } = await db.from('freight_broker_registrations').select('id', { count: 'exact', head: true })
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
      </div>
      ${forAdmin ? `<p>Review this registration in the <a href="${new URL('/admin/freight-broker/', config.appUrl)}">back office</a>.</p>` : ''}
      <p>Best regards,<br>Iman Logistics</p>
    </div>`
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
  const entity = { entityType: 'freight_broker_registrations', entityId: row.id }
  const ctx = notificationContext(row, payment)

  await sendEmail({ ...entity, template: 'freight_broker.payment_confirmed', from: config.freightBrokerEmailFrom, to: row.email, subject: `Payment Confirmed - ${ctx.registrationNo}`, html: paymentEmailHtml(ctx, false) })
  await sendEmail({ ...entity, template: 'freight_broker.payment_received_staff', from: config.freightBrokerEmailFrom, to: config.freightBrokerNotifyEmail, subject: `New payment received - ${ctx.program}`, html: paymentEmailHtml(ctx, true) })
  await sendSms({ ...entity, template: 'freight_broker.payment_confirmed_sms', to: row.phone, body: smsText(ctx, false) })
  if (config.freightBrokerNotifyPhone) await sendSms({ ...entity, template: 'freight_broker.payment_received_staff_sms', to: config.freightBrokerNotifyPhone, body: smsText(ctx, true) })
}

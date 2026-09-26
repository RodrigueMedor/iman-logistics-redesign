import type { SupabaseClient } from '@supabase/supabase-js'
import { FREIGHT_BROKER_POLICY_TEXT, FREIGHT_BROKER_POLICY_VERSION, FREIGHT_BROKER_PROGRAM } from '../../../src/features/freightBroker/program'
import { config } from '../config'
import { escapeHtml, sendEmail, sendSms } from './notifications'

// Freight Broker Masterclass registration helpers, adapted from the dispatcher
// registration in the Iman Trucking School server (server-express.js).

const registrationSelect = '*, class:freight_broker_classes(id, name, starts_at, ends_at, location, schedule_notes, price_cents)'

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
  class: { id: string; name: string; starts_at: string; ends_at: string; location: string | null; schedule_notes: string | null; price_cents: number } | null
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
    classLocation: row.class?.location ?? null,
    classScheduleNotes: row.class?.schedule_notes ?? null,
    status: row.status,
    paymentStatus: row.payment_status,
    policyAccepted: Boolean(row.payment_policy_accepted_at),
    policySignature: row.payment_policy_signature,
    policyAcceptedAt: row.payment_policy_accepted_at,
    policyVersion: row.payment_policy_version,
    policyText: FREIGHT_BROKER_POLICY_TEXT,
  }
}

const longDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' }) : null
const card = (rows: string) => `<div style="background: #f5f7fb; padding: 20px; border-radius: 8px; margin: 20px 0;">${rows}</div>`
const line = (label: string, value: string, first = false) => `<p style="margin: ${first ? '0' : '8px 0 0 0'};"><strong>${label}:</strong> ${value}</p>`

// Sent once a registration payment is confirmed: registrant email, department
// email, and registrant SMS. Each is independent, so one failing never blocks
// the others or the payment.
export async function sendRegistrationPaidNotifications(db: SupabaseClient, registrationId: string, amountCents: number) {
  const row = await loadRegistration(db, registrationId)
  if (!row) return
  const entity = { entityType: 'freight_broker_registrations', entityId: row.id }
  const className = escapeHtml(row.class?.name || FREIGHT_BROKER_PROGRAM.defaultClassName)
  const amount = `$${(amountCents / 100).toFixed(2)}`
  const start = longDate(row.class?.starts_at) || 'Rolling enrollment'
  const end = longDate(row.class?.ends_at)
  const signedAt = row.payment_policy_accepted_at ? new Date(row.payment_policy_accepted_at).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : null
  const policyVersion = escapeHtml(row.payment_policy_version || FREIGHT_BROKER_POLICY_VERSION)
  const classLines = [
    line('Class', className),
    line('Starts', start),
    end ? line('Ends', end) : '',
    line('Location', escapeHtml(row.class?.location || 'To be announced')),
    row.class?.schedule_notes ? line('Schedule', escapeHtml(row.class.schedule_notes)) : '',
    line('Amount Paid', amount),
  ].join('')

  await sendEmail({
    ...entity,
    template: 'freight_broker.registration_confirmed',
    from: config.freightBrokerEmailFrom,
    to: row.email,
    subject: `${FREIGHT_BROKER_PROGRAM.name} Registration Confirmed - ${row.registration_no}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A005A;">${FREIGHT_BROKER_PROGRAM.name} Registration Confirmed</h2>
        <p>Dear ${escapeHtml(row.first_name)},</p>
        <p>Thank you for registering for <strong>${className}</strong> with Iman Logistics. Your registration is confirmed.</p>
        ${card(line('Registration Number', escapeHtml(row.registration_no), true) + classLines + line('Payment Status', 'Paid'))}
        <div style="background: #fff9e6; border-left: 4px solid #ffb300; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #5d4037;">
          <strong>Registration Policy:</strong> ${FREIGHT_BROKER_POLICY_TEXT}
          ${signedAt ? `<br><br><strong>Electronically signed by:</strong> ${escapeHtml(row.payment_policy_signature)} on ${signedAt} (policy version ${policyVersion})` : ''}
        </div>
        <p>Please keep this email for your records. Our team will contact you with class access and materials before your session begins.</p>
        <p>Best regards,<br>Iman Logistics</p>
      </div>`,
  })

  await sendEmail({
    ...entity,
    template: 'freight_broker.registration_paid_staff',
    from: config.freightBrokerEmailFrom,
    to: config.freightBrokerNotifyEmail,
    subject: `New ${FREIGHT_BROKER_PROGRAM.name} Registration Paid - ${row.registration_no}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A005A;">New Paid ${FREIGHT_BROKER_PROGRAM.name} Registration</h2>
        ${card([
          line('Registration Number', escapeHtml(row.registration_no), true),
          line('Student', `${escapeHtml(row.first_name)} ${escapeHtml(row.last_name)}`),
          line('Email', escapeHtml(row.email)),
          line('Phone', escapeHtml(row.phone || 'Not provided')),
          line('Address', `${escapeHtml(row.address_line1)}${row.address_line2 ? `, ${escapeHtml(row.address_line2)}` : ''}, ${escapeHtml(row.city)}, ${escapeHtml(row.state)} ${escapeHtml(row.zip_code)}`),
        ].join(''))}
        ${card(classLines)}
        <div style="background: #fff9e6; border-left: 4px solid #ffb300; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #5d4037;">
          <strong>Policy signature:</strong> ${escapeHtml(row.payment_policy_signature || 'Not recorded')}<br>
          <strong>Accepted at:</strong> ${signedAt || 'Not recorded'}<br>
          <strong>Policy version:</strong> ${policyVersion}
        </div>
        <p>Review this registration in the <a href="${new URL('/admin/freight-broker/', config.appUrl)}">back office</a>.</p>
      </div>`,
  })

  await sendSms({
    ...entity,
    template: 'freight_broker.registration_confirmed_sms',
    to: row.phone,
    body: `Iman Logistics: Your registration ${row.registration_no} for ${row.class?.name || FREIGHT_BROKER_PROGRAM.defaultClassName} is confirmed. Class starts ${row.class?.starts_at ? new Date(row.class.starts_at).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : 'on a rolling basis'}. Check your email for the full receipt.`,
  })
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { config, databaseConfigured } from '../config'
import { escapeHtml, sendEmail } from './notifications'
import { reconcileSession, stripeClient, stripeConfigured } from './stripe'
import { serviceClient } from './supabase'

// Automatic follow-up email for Dispatch Masterclass registrations that are
// still unpaid a day after registering: asks the student whether they were
// charged (reply to confirm) or invites them to complete their registration.

const TEMPLATE = 'freight_broker.payment_follow_up'
const ENTITY_TYPE = 'freight_dispatch_masterclass_registrations'
const RECENT_DAYS = 7
const log = (message: string, data?: unknown) => console.log(`[payment-follow-up] ${message}`, data ?? '')

type Registration = { status: string; payment_status: string; created_at: string }

export function followUpDue(reg: Registration, ctx: { now: Date; delayHours: number; emailHasPaid: boolean; emailFollowedUpRecently: boolean }) {
  if (reg.status !== 'SUBMITTED' || reg.payment_status !== 'pending') return false
  if (ctx.now.getTime() - Date.parse(reg.created_at) < ctx.delayHours * 60 * 60 * 1000) return false
  return !ctx.emailHasPaid && !ctx.emailFollowedUpRecently
}

export function paymentFollowUpEmailHtml(firstName: string, registrationNo: string, amount: string) {
  const link = 'https://imanlogistics.com/freight-dispatch-masterclass/'
  return `<div style="font-family:Arial,sans-serif;max-width:600px;color:#1f2937">
<p>Hello ${escapeHtml(firstName || 'there')},</p>
<p>Thank you for registering for the Iman Logistics Freight Dispatch Masterclass (registration <strong>${escapeHtml(registrationNo)}</strong>). Due to a technical issue on our website, your registration still shows <strong>payment pending</strong> in our system.</p>
<p><strong>Did you see a payment of ${escapeHtml(amount)} to Iman Logistics on your bank or card statement?</strong></p>
<ul><li><strong>If yes,</strong> please reply to this email to confirm (if possible, include the date and the last 4 digits of the card). Once we receive your reply, we will update your payment status and send your registration confirmation.</li>
<li><strong>If no,</strong> you have not been charged. You can complete your registration anytime at <a href="${link}">${link}</a>.</li></ul>
<p>We apologize for the inconvenience.</p>
<p>Best regards,<br>Iman Logistics<br><a href="mailto:info@imanlogistics.com">info@imanlogistics.com</a></p></div>`
}

type Candidate = { id: string; registration_no: string; first_name: string; email: string; status: string; payment_status: string; created_at: string; class: { price_cents: number } | null }

export async function runPaymentFollowUps(db: SupabaseClient, now = new Date()) {
  const { delayHours, batchSize } = config.paymentFollowUp
  const cutoff = new Date(now.getTime() - delayHours * 60 * 60 * 1000).toISOString()
  const { data, error } = await db.from(ENTITY_TYPE).select('id, registration_no, first_name, email, status, payment_status, created_at, class:freight_dispatch_masterclass_classes(price_cents)')
    .eq('status', 'SUBMITTED').eq('payment_status', 'pending').lte('created_at', cutoff).order('created_at', { ascending: true }).limit(500)
  if (error) throw error
  const candidates = (data ?? []) as unknown as Candidate[]
  if (!candidates.length) return { candidates: 0, sent: 0, confirmedByStripe: 0, skipped: 0 }

  const emails = [...new Set(candidates.map(reg => reg.email.toLowerCase()))]
  const { data: paidRows } = await db.from(ENTITY_TYPE).select('email').in('email', emails).eq('payment_status', 'paid')
  const paidEmails = new Set((paidRows ?? []).map(row => String(row.email).toLowerCase()))
  const { data: sentRows } = await db.from('notification_log').select('entity_id, recipient, created_at').eq('template', TEMPLATE).eq('status', 'sent')
  const sentRegistrations = new Set((sentRows ?? []).map(row => String(row.entity_id)))
  const recentSince = now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000
  const recentEmails = new Set((sentRows ?? []).filter(row => Date.parse(row.created_at) >= recentSince).map(row => String(row.recipient).toLowerCase()))

  const totals = { candidates: candidates.length, sent: 0, confirmedByStripe: 0, skipped: 0 }
  for (const reg of candidates) {
    if (totals.sent >= batchSize) break
    const email = reg.email.toLowerCase()
    if (sentRegistrations.has(reg.id) || !followUpDue(reg, { now, delayHours, emailHasPaid: paidEmails.has(email), emailFollowedUpRecently: recentEmails.has(email) })) { totals.skipped += 1; continue }

    // Never ask "did you pay?" if Stripe says they did: check every unfinished checkout first.
    const { data: payments } = await db.from('payments').select('*').eq('broker_registration_id', reg.id).order('created_at', { ascending: false })
    let stripeUnknown = false
    for (const payment of payments ?? []) {
      if (payment.provider !== 'stripe' || !payment.stripe_checkout_session_id || !['pending', 'processing'].includes(payment.status)) continue
      // Can't ask Stripe? Then we don't know they didn't pay: try again next run.
      if (!stripeConfigured() || !(await reconcileSession(db, stripeClient(), payment))) stripeUnknown = true
    }
    if (stripeUnknown) { totals.skipped += 1; continue }
    const { data: fresh } = await db.from(ENTITY_TYPE).select('status, payment_status').eq('id', reg.id).single()
    if (fresh?.payment_status !== 'pending' || fresh?.status !== 'SUBMITTED') { totals.confirmedByStripe += 1; paidEmails.add(email); continue }

    const cents = Number(payments?.[0]?.amount_cents ?? reg.class?.price_cents ?? 0)
    const delivery = await sendEmail({
      entityType: ENTITY_TYPE, entityId: reg.id, template: TEMPLATE, idempotencyKey: `payment-follow-up:${reg.id}`,
      from: config.freightBrokerEmailFrom, replyTo: 'info@imanlogistics.com', to: reg.email,
      subject: 'Your Freight Dispatch Masterclass registration — please confirm your payment',
      html: paymentFollowUpEmailHtml(reg.first_name, reg.registration_no, `$${(cents / 100).toFixed(2)}`),
    })
    if (delivery.status === 'sent') { totals.sent += 1; recentEmails.add(email) } else totals.skipped += 1
  }
  return totals
}

export function startPaymentFollowUpScheduler() {
  const settings = config.paymentFollowUp
  if (!settings.enabled) return log('scheduler disabled (PAYMENT_FOLLOW_UP_EMAILS_ENABLED=false)')
  if (!databaseConfigured()) return log('scheduler not started: the database is not configured')
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const totals = await runPaymentFollowUps(serviceClient())
      if (totals.sent || totals.confirmedByStripe) log('run finished', totals)
    } catch (caught) {
      console.error('[payment-follow-up] run failed', caught)
    } finally {
      running = false
    }
  }
  const pollMs = Math.max(60, settings.pollSeconds) * 1000
  setInterval(() => void tick(), pollMs)
  setTimeout(() => void tick(), 60_000)
  log('scheduler started', { everySeconds: pollMs / 1000, delayHours: settings.delayHours })
}

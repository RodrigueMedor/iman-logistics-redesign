import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config'
import { HttpError } from './http'

// Mirrors the Iman Trucking School payment server (server-express.js):
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are server-only and must never
// be prefixed with VITE_. APP_URL is the canonical site origin for redirects.
export const STRIPE_API_VERSION = '2024-11-20.acacia'
export { bookingPaymentPolicyText as BOOKING_PAYMENT_POLICY_TEXT, bookingPaymentPolicyVersion as BOOKING_PAYMENT_POLICY_VERSION } from '../../../src/features/consultation/serviceCatalog'

let client: Stripe | null = null

export const stripeConfigured = () => Boolean(config.stripeSecretKey)

export function stripeClient(): Stripe {
  if (!config.stripeSecretKey) throw new HttpError(503, 'Online payment is not available yet.')
  client ??= new Stripe(config.stripeSecretKey, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    ...(config.stripeApi ?? {}),
  })
  return client
}

export function checkoutReturnUrl(pathname: string, params: Record<string, string>) {
  let base: URL
  try {
    base = new URL(config.appUrl)
  } catch {
    throw new Error('APP_URL must be a valid absolute URL')
  }
  base.pathname = pathname
  base.hash = ''
  // {CHECKOUT_SESSION_ID} is filled in by Stripe and must stay unencoded.
  base.search = Object.entries(params).map(([key, value]) => `${key}=${value === '{CHECKOUT_SESSION_ID}' ? value : encodeURIComponent(value)}`).join('&')
  return base.toString()
}

type PaymentRow = {
  id: string
  booking_id: string | null
  amount_cents: number
  currency: string
  status: string
  stripe_payment_intent_id: string | null
  metadata: Record<string, unknown>
}

const final = ['paid', 'refunded']

async function paymentById(db: SupabaseClient, id: string) {
  const { data } = await db.from('payments').select('*').eq('id', id).maybeSingle()
  return data as PaymentRow | null
}

async function setStatus(db: SupabaseClient, id: string, changes: Record<string, unknown>) {
  const { error } = await db.from('payments').update(changes).eq('id', id)
  if (error) throw error
}

// An unpaid booking holds its time slot; release it once its checkout is gone.
async function releaseBookingIfUnpaid(db: SupabaseClient, bookingId: string | null) {
  if (!bookingId) return
  const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('booking_id', bookingId).in('status', ['pending', 'processing', 'paid'])
  if (count) return
  await db.from('consultation_bookings').update({ status: 'cancelled' })
    .eq('id', bookingId).eq('status', 'pending').in('payment_status', ['unpaid', 'failed'])
}

// Validates what Stripe collected against what the server expected before
// marking anything paid (same rule as the school server).
export async function finalizeSuccessfulPayment(db: SupabaseClient, payment: PaymentRow | null, paidAmount: number | null, paidCurrency: string | null, paymentIntentId?: string | null) {
  if (!payment || final.includes(payment.status)) return
  const expectedAmount = Number(payment.metadata?.expected_amount ?? payment.amount_cents)
  const expectedCurrency = payment.currency.toLowerCase()
  if (paidAmount !== expectedAmount || (paidCurrency || '').toLowerCase() !== expectedCurrency) {
    console.error(`Payment mismatch: expected ${expectedAmount} ${expectedCurrency}, received ${paidAmount} ${paidCurrency}`)
    await setStatus(db, payment.id, { status: 'failed', error_message: `Payment mismatch: expected ${expectedAmount} ${expectedCurrency}, received ${paidAmount} ${paidCurrency}` })
    return
  }
  await setStatus(db, payment.id, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    error_message: '',
    ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId, provider_reference: paymentIntentId } : {}),
  })
}

async function findPaymentByIntent(db: SupabaseClient, stripe: Stripe, paymentIntentId: string) {
  const { data: direct } = await db.from('payments').select('*').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle()
  if (direct) return direct as PaymentRow
  // PaymentIntent events can arrive before checkout.session.completed stores the id.
  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 })
  const paymentId = sessions.data[0]?.metadata?.payment_id
  if (!paymentId) return null
  const payment = await paymentById(db, paymentId)
  if (payment && !payment.stripe_payment_intent_id) {
    await setStatus(db, payment.id, { stripe_payment_intent_id: paymentIntentId, provider_reference: paymentIntentId })
    payment.stripe_payment_intent_id = paymentIntentId
  }
  return payment
}

const intentId = (value: string | Stripe.PaymentIntent | null) => typeof value === 'string' ? value : value?.id ?? null

async function sessionCompleted(db: SupabaseClient, session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.payment_id
  if (!paymentId) return console.error('No payment_id in checkout session metadata')
  const payment = await paymentById(db, paymentId)
  if (!payment || final.includes(payment.status)) return
  const paymentIntent = intentId(session.payment_intent)
  await setStatus(db, payment.id, { status: 'processing', ...(paymentIntent ? { stripe_payment_intent_id: paymentIntent, provider_reference: paymentIntent } : {}) })
  // Card payments are already paid when Checkout completes.
  if (session.payment_status === 'paid') await finalizeSuccessfulPayment(db, { ...payment, status: 'processing' }, session.amount_total, session.currency, paymentIntent)
}

async function sessionFailedOrExpired(db: SupabaseClient, session: Stripe.Checkout.Session, status: 'failed' | 'canceled') {
  const paymentId = session.metadata?.payment_id
  if (!paymentId) return
  const payment = await paymentById(db, paymentId)
  if (!payment || final.includes(payment.status) || payment.metadata?.superseded) return
  await setStatus(db, payment.id, { status, ...(status === 'failed' ? { error_message: 'Stripe reported that the delayed payment failed' } : {}) })
  if (status === 'canceled') await releaseBookingIfUnpaid(db, payment.booking_id)
}

export async function handleStripeEvent(db: SupabaseClient, stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      return sessionCompleted(db, event.data.object)
    case 'checkout.session.async_payment_succeeded':
      return sessionCompleted(db, { ...event.data.object, payment_status: 'paid' })
    case 'checkout.session.async_payment_failed':
      return sessionFailedOrExpired(db, event.data.object, 'failed')
    case 'checkout.session.expired':
      return sessionFailedOrExpired(db, event.data.object, 'canceled')
    case 'payment_intent.succeeded': {
      const payment = await findPaymentByIntent(db, stripe, event.data.object.id)
      return finalizeSuccessfulPayment(db, payment, event.data.object.amount_received || event.data.object.amount, event.data.object.currency, event.data.object.id)
    }
    case 'payment_intent.payment_failed': {
      const payment = await findPaymentByIntent(db, stripe, event.data.object.id)
      if (!payment || final.includes(payment.status)) return
      return setStatus(db, payment.id, { status: 'failed', error_message: event.data.object.last_payment_error?.message || 'Payment failed' })
    }
    case 'charge.refunded': {
      const id = intentId(event.data.object.payment_intent)
      const payment = id ? await findPaymentByIntent(db, stripe, id) : null
      if (!payment) return
      // Partial refunds keep the payment paid; staff can see them in Stripe.
      if (!event.data.object.refunded) return setStatus(db, payment.id, { metadata: { ...payment.metadata, amount_refunded: event.data.object.amount_refunded } })
      return setStatus(db, payment.id, { status: 'refunded', refunded_at: new Date().toISOString() })
    }
    default:
      console.log(`Unhandled Stripe webhook event: ${event.type}`)
  }
}

// Fallback used by the status page when the webhook is delayed (or not
// reachable in local testing): ask Stripe directly.
export async function reconcileSession(db: SupabaseClient, stripe: Stripe, payment: PaymentRow & { stripe_checkout_session_id: string }) {
  if (!['pending', 'processing'].includes(payment.status)) return
  try {
    const session = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id)
    if (session.payment_status === 'paid') await finalizeSuccessfulPayment(db, payment, session.amount_total, session.currency, intentId(session.payment_intent))
    else if (session.status === 'expired') await sessionFailedOrExpired(db, session, 'canceled')
  } catch (error) {
    console.warn('Could not reconcile Stripe session during status check:', error instanceof Error ? error.message : error)
  }
}

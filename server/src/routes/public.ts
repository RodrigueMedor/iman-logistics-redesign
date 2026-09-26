import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { serviceCatalog } from '../../../src/features/consultation/serviceCatalog'
import { config } from '../config'
import { HttpError, parse } from '../lib/http'
import { createUploadSlot, enforceEmailLimit } from '../lib/submissions'
import { publicClient, serviceClient } from '../lib/supabase'
import { BOOKING_PAYMENT_POLICY_TEXT, BOOKING_PAYMENT_POLICY_VERSION, checkoutReturnUrl, reconcileSession, stripeClient, stripeConfigured } from '../lib/stripe'
import { booking, bookingCheckout, contactSubmission, jobApplication, passwordReset } from '../schemas'

export const publicRoutes = Router()

// What the website needs to know about server features.
publicRoutes.get('/public-config', (_req, res) => {
  res.json({ onlinePayments: stripeConfigured() })
})

// Per-IP limit on everything that writes, on top of the per-email limits.
const submissions = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.submissionRateLimit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } })
const lookups = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } })

publicRoutes.post('/contact-submissions', submissions, async (req, res) => {
  const input = parse(contactSubmission, req.body)
  const email = input.email.toLowerCase()
  const db = serviceClient()
  await enforceEmailLimit(db, 'contact_submissions', email, 5)
  const upload = input.attachment ? await createUploadSlot(db, 'contact', input.attachment) : null
  const { data, error } = await db.from('contact_submissions').insert({
    full_name: input.fullName, company: input.company, email, phone: input.phone, subject: input.subject, message: input.message,
    preferred_method: input.preferredMethod, service: input.service, attachment_path: upload?.path ?? null, attachment_name: upload?.name ?? null,
  }).select('reference').single()
  if (error) throw error
  res.status(201).json({ reference: data.reference, upload: upload && { path: upload.path, token: upload.token } })
})

publicRoutes.post('/job-applications', submissions, async (req, res) => {
  const input = parse(jobApplication, req.body)
  const email = input.email.toLowerCase()
  const db = serviceClient()
  await enforceEmailLimit(db, 'job_applications', email, 3)
  const upload = input.resume ? await createUploadSlot(db, 'resumes', input.resume) : null
  const { data, error } = await db.from('job_applications').insert({
    position: input.position, full_name: input.fullName, email, phone: input.phone, location: input.location, experience: input.experience,
    cover_letter: input.coverLetter, resume_path: upload?.path ?? null, resume_name: upload?.name ?? null,
  }).select('reference').single()
  if (error) throw error
  res.status(201).json({ reference: data.reference, upload: upload && { path: upload.path, token: upload.token } })
})

publicRoutes.get('/bookings/availability', lookups, async (req, res) => {
  const { date } = parse(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), req.query, 'Provide a date as YYYY-MM-DD.')
  const { data, error } = await publicClient().rpc('consultation_booked_slots', { p_date: date })
  if (error) throw error
  res.json({ date, bookedTimes: data ?? [] })
})

publicRoutes.post('/bookings', submissions, async (req, res) => {
  const input = parse(booking, req.body, 'Please check the booking details and try again.')
  const service = serviceCatalog.find(item => item.id === input.serviceId)!
  const day = new Date(`${input.date}T12:00:00Z`)
  if (Number.isNaN(day.getTime()) || input.date < new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'Select a future date.')
  if (day.getUTCDay() === 0 || day.getUTCDay() === 6) throw new HttpError(400, 'Consultations are available Monday to Friday.')

  const email = input.email.toLowerCase()
  const db = serviceClient()
  await enforceEmailLimit(db, 'consultation_bookings', email, 3)
  const { data, error } = await db.from('consultation_bookings').insert({
    service_id: service.id, service_name: service.name, duration_minutes: service.duration, price_cents: service.price * 100,
    booking_date: input.date, booking_time: input.time, time_zone: input.timeZone, full_name: input.fullName, email,
    phone: input.phone, company: input.company, meeting_type: input.meetingType, message: input.message,
  }).select('reference').single()
  if (error?.code === '23505') throw new HttpError(409, 'That time was just booked. Please choose another time.')
  if (error) throw error
  res.status(201).json({ reference: data.reference, paymentRequired: stripeConfigured() })
})

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

// Starts Stripe Checkout for a booking, following the Iman Trucking School
// flow: a pending payment row, then a Checkout Session priced by the server.
publicRoutes.post('/bookings/:reference/checkout', submissions, async (req, res) => {
  const input = parse(bookingCheckout, req.body, 'Invalid checkout request.')
  const stripe = stripeClient()
  const db = serviceClient()

  const { data: row } = await db.from('consultation_bookings')
    .select('id, reference, email, full_name, service_name, duration_minutes, price_cents, booking_date, booking_time, status, payment_status')
    .eq('reference', String(req.params.reference).toUpperCase()).maybeSingle()
  if (!row) throw new HttpError(404, 'Booking not found.')
  if (row.email !== input.email.toLowerCase()) throw new HttpError(400, 'Email does not match the booking.')
  if (['paid', 'waived'].includes(row.payment_status)) throw new HttpError(400, 'This booking has already been paid.')
  if (!['pending', 'confirmed'].includes(row.status)) throw new HttpError(409, 'This booking is no longer active. Please book a new time.')
  if (normalizeName(input.paymentPolicySignature) !== normalizeName(row.full_name)) throw new HttpError(400, 'Type your full name exactly as entered on the booking to sign the payment policy.')
  if (!Number.isInteger(row.price_cents) || row.price_cents <= 0 || row.price_cents > 1_000_000) throw new HttpError(400, 'Invalid payment amount.')

  // Expire any open checkout so the customer cannot pay twice. Marked
  // superseded first, so the resulting "expired" webhook keeps the time slot.
  const { data: open } = await db.from('payments').select('id, metadata, stripe_checkout_session_id').eq('booking_id', row.id).eq('provider', 'stripe').eq('status', 'pending')
  for (const payment of open ?? []) {
    await db.from('payments').update({ status: 'canceled', metadata: { ...payment.metadata, superseded: true } }).eq('id', payment.id).eq('status', 'pending')
    if (payment.stripe_checkout_session_id) {
      try { await stripe.checkout.sessions.expire(payment.stripe_checkout_session_id) } catch { /* already completed or expired */ }
    }
  }

  const policy = { payment_policy_version: BOOKING_PAYMENT_POLICY_VERSION, payment_policy_signature: input.paymentPolicySignature, payment_policy_accepted_at: new Date().toISOString() }
  const { data: payment, error } = await db.from('payments').insert({
    booking_id: row.id, payer_name: row.full_name, payer_email: row.email, description: `${row.service_name} · ${row.reference}`,
    amount_cents: row.price_cents, currency: 'USD', method: 'card', status: 'pending', provider: 'stripe',
    metadata: { expected_amount: row.price_cents, booking_reference: row.reference, policy_text: BOOKING_PAYMENT_POLICY_TEXT, ...policy },
  }).select('id').single()
  if (error) throw error

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: row.reference,
    customer_email: row.email,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: row.price_cents, product_data: { name: row.service_name, description: `Booking ${row.reference} · ${row.booking_date} at ${row.booking_time} · ${row.duration_minutes} minutes` } } }],
    custom_text: { submit: { message: BOOKING_PAYMENT_POLICY_TEXT } },
    // Stripe's minimum; an abandoned checkout releases the time slot soon after.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: checkoutReturnUrl('/consultants/', { payment: 'success', session_id: '{CHECKOUT_SESSION_ID}' }),
    cancel_url: checkoutReturnUrl('/consultants/', { payment: 'canceled', session_id: '{CHECKOUT_SESSION_ID}' }),
    metadata: { payment_id: payment.id, booking_id: row.id, booking_reference: row.reference, expected_amount: String(row.price_cents), payment_policy_version: BOOKING_PAYMENT_POLICY_VERSION },
  })

  const { error: linkError } = await db.from('payments').update({ stripe_checkout_session_id: session.id }).eq('id', payment.id)
  if (linkError) throw linkError
  await db.from('consultation_bookings').update(policy).eq('id', row.id)
  res.json({ sessionId: session.id, url: session.url })
})

const publicStatus: Record<string, string> = { pending: 'pending', processing: 'processing', paid: 'succeeded', failed: 'failed', canceled: 'canceled', refunded: 'refunded' }

// Used by the page Stripe returns to. Session ids are unguessable.
publicRoutes.get('/payments/status', lookups, async (req, res) => {
  const { session_id: sessionId } = parse(z.object({ session_id: z.string().regex(/^cs_[A-Za-z0-9_]{8,200}$/) }), req.query, 'Invalid checkout session.')
  const db = serviceClient()
  const load = () => db.from('payments').select('*').eq('stripe_checkout_session_id', sessionId).maybeSingle()
  let { data: payment } = await load()
  if (!payment) throw new HttpError(404, 'Payment not found.')
  // Fallback when the webhook is delayed: ask Stripe directly.
  if (stripeConfigured() && ['pending', 'processing'].includes(payment.status)) {
    await reconcileSession(db, stripeClient(), payment)
    payment = (await load()).data ?? payment
  }
  const { data: row } = payment.booking_id
    ? await db.from('consultation_bookings').select('reference, service_name, duration_minutes, booking_date, booking_time, time_zone, meeting_type, full_name, email, status, payment_status').eq('id', payment.booking_id).maybeSingle()
    : { data: null }
  res.json({
    status: publicStatus[payment.status] ?? 'pending',
    amount_cents: payment.amount_cents,
    currency: payment.currency,
    booking: row && {
      reference: row.reference, serviceName: row.service_name, duration: row.duration_minutes, date: row.booking_date, time: row.booking_time,
      timeZone: row.time_zone, meetingType: row.meeting_type, fullName: row.full_name, email: row.email, status: row.status, paymentStatus: row.payment_status,
    },
  })
})

publicRoutes.get('/tracking/:reference', lookups, async (req, res) => {
  const { data, error } = await publicClient().rpc('track_shipment', { p_reference: String(req.params.reference) })
  if (error) throw error
  if (!data) throw new HttpError(404, 'No shipment matches that reference.')
  res.json(data)
})

// Recovery from the sign-in page is limited to super admins. The reply never
// reveals whether an account exists.
publicRoutes.post('/auth/password-reset', submissions, async (req, res) => {
  const email = parse(passwordReset, req.body, 'Enter a valid email address.').email.toLowerCase()
  const { data: profile } = await serviceClient().from('profiles').select('id').eq('email', email).eq('role', 'super_admin').eq('active', true).maybeSingle()
  if (profile) {
    const { error } = await publicClient().auth.resetPasswordForEmail(email, { redirectTo: new URL('/admin/reset-password/', config.appUrl).toString() })
    if (error) console.error('Password reset email failed', error)
  }
  res.json({ message: 'If that address belongs to a super-admin account, a reset link has been sent.' })
})

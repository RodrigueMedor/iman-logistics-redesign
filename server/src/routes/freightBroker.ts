import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { FREIGHT_BROKER_POLICY_TEXT, FREIGHT_BROKER_POLICY_VERSION, FREIGHT_BROKER_PROGRAM, normalizePersonName } from '../../../src/features/freightBroker/program'
import { config } from '../config'
import { backOffice, requireRole, staff, superAdminOnly } from '../lib/auth'
import { classIsFull, loadRegistration, makeRegistrationNo } from '../lib/freightBroker'
import { HttpError, parse } from '../lib/http'
import { consumeRegistrationVerification, resendRegistrationCode, startRegistrationVerification, verifyRegistrationCode } from '../lib/registrationVerification'
import { checkoutReturnUrl, stripeClient } from '../lib/stripe'
import { publicClient, serviceClient } from '../lib/supabase'
import { freightBrokerCheckout, freightBrokerClassInput, freightBrokerRegistration, registrationVerificationCode, registrationVerificationResend, registrationVerificationStart } from '../schemas'

// Freight Dispatch Masterclass registration: the Iman Trucking School dispatcher
// registration endpoints (/api/create-dispatcher-registration and
// /api/create-dispatcher-checkout), adapted to this API.
export const freightBrokerRoutes = Router()
export const freightBrokerAdminRoutes = Router()

const submissions = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.submissionRateLimit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } })
const verificationRequests = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many verification requests. Please try again later.' } })
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

freightBrokerRoutes.get('/classes', async (_req, res) => {
  const { data, error } = await publicClient().rpc('freight_broker_open_classes')
  if (error) throw error
  // Always live: back-office edits must show on the website immediately.
  res.set('Cache-Control', 'no-store').json(data)
})

freightBrokerRoutes.post('/verifications', verificationRequests, async (req, res) => {
  const input = parse(registrationVerificationStart, req.body, 'Enter a valid email address and phone number.')
  res.status(201).json(await startRegistrationVerification(serviceClient(), input.email, input.phone, req.ip || 'unknown'))
})

freightBrokerRoutes.post('/verifications/:id/verify', verificationRequests, async (req, res) => {
  if (!isUuid(String(req.params.id))) throw new HttpError(404, 'Verification request not found.')
  const input = parse(registrationVerificationCode, req.body)
  res.json(await verifyRegistrationCode(serviceClient(), String(req.params.id), input.channel, input.code))
})

freightBrokerRoutes.post('/verifications/:id/resend', verificationRequests, async (req, res) => {
  if (!isUuid(String(req.params.id))) throw new HttpError(404, 'Verification request not found.')
  const input = parse(registrationVerificationResend, req.body)
  res.json(await resendRegistrationCode(serviceClient(), String(req.params.id), input.channel))
})

freightBrokerRoutes.post('/registrations', submissions, async (req, res) => {
  const input = parse(freightBrokerRegistration, req.body, 'Complete every required registration field.')
  const db = serviceClient()

  // Resolve exactly the session the student selected; never silently move a
  // verified registration to another class.
  const now = new Date().toISOString()
  let classRow: { id: string; allows_online: boolean; allows_in_person: boolean } | null = null
  if (isUuid(input.classId)) {
    const { data } = await db.from('freight_dispatch_masterclass_classes').select('id, allows_online, allows_in_person').eq('id', input.classId).eq('status', 'OPEN').gte('ends_at', now).maybeSingle()
    classRow = data
  }
  if (!classRow) throw new HttpError(404, 'The selected Freight Dispatch Masterclass session is not available.')
  if (input.attendanceType === 'online' && !classRow.allows_online) throw new HttpError(409, 'Online attendance is not available for this session.')
  if (input.attendanceType === 'in_person' && !classRow.allows_in_person) throw new HttpError(409, 'In-person attendance is not available for this session.')

  const email = input.email.toLowerCase()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await db.from('freight_dispatch_masterclass_registrations').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) throw new HttpError(429, 'Too many registrations. Please try again later.')
  const verification = await consumeRegistrationVerification(db, input.verificationId, input.verificationToken, email, input.phone)

  const { data, error } = await db.from('freight_dispatch_masterclass_registrations').insert({
    registration_no: makeRegistrationNo(),
    first_name: input.firstName, last_name: input.lastName, email, phone: input.phone || null,
    address_line1: input.address1, address_line2: input.address2 || null, city: input.city, state: input.state, zip_code: input.zip,
    class_id: classRow.id, attendance_type: input.attendanceType,
    email_verified_at: verification.email_verified_at, phone_verified_at: verification.phone_verified_at, verification_id: verification.id,
    status: 'SUBMITTED', payment_status: 'pending',
  }).select('id, registration_no, class_id').single()
  if (error) throw error
  res.status(201).json(data)
})

freightBrokerRoutes.post('/registrations/:id/checkout', submissions, async (req, res) => {
  const input = parse(freightBrokerCheckout, req.body, 'Invalid checkout request.')
  if (!isUuid(String(req.params.id))) throw new HttpError(404, 'Registration not found.')
  const stripe = stripeClient()
  const db = serviceClient()

  const registration = await loadRegistration(db, String(req.params.id))
  if (!registration) throw new HttpError(404, 'Registration not found.')
  if (registration.email !== input.email.toLowerCase()) throw new HttpError(400, 'Email does not match the registration.')
  if (registration.payment_status === 'paid') throw new HttpError(400, 'This registration has already been paid and confirmed.')
  if (registration.status === 'CANCELED') throw new HttpError(409, 'This registration was canceled. Please register again.')
  if (!registration.class) throw new HttpError(409, 'This class session is no longer available. Please register again.')
  // The price comes from the class stored on the registration, never from the client.
  if (input.classId && input.classId !== registration.class.id) throw new HttpError(409, 'Class does not match the registration.')
  // Status, deadline, and seats come from the session, checked at payment time (live rules).
  if (registration.class.status !== 'OPEN') throw new HttpError(409, 'This class session is no longer accepting registrations.')
  if (registration.class.registration_deadline && new Date(registration.class.registration_deadline) < new Date()) throw new HttpError(409, 'The registration deadline for this class has passed.')
  if (await classIsFull(db, registration.class.id)) throw new HttpError(409, 'This class is full.')
  if (normalizePersonName(input.paymentPolicySignature) !== normalizePersonName(`${registration.first_name} ${registration.last_name}`)) {
    throw new HttpError(400, 'Type your full legal name exactly as it appears on this form to sign the payment policy.')
  }

  const priceCents = registration.class.price_cents
  if (!Number.isInteger(priceCents) || priceCents <= 0 || priceCents > 1_000_000) throw new HttpError(400, 'Invalid payment amount.')

  // Expire any open checkout for this registration so it cannot be paid
  // twice. Marked superseded first, so the "expired" webhook is ignored.
  const { data: open } = await db.from('payments').select('id, metadata, stripe_checkout_session_id').eq('broker_registration_id', registration.id).eq('provider', 'stripe').eq('status', 'pending')
  for (const payment of open ?? []) {
    await db.from('payments').update({ status: 'canceled', metadata: { ...payment.metadata, superseded: true } }).eq('id', payment.id).eq('status', 'pending')
    if (payment.stripe_checkout_session_id) {
      try { await stripe.checkout.sessions.expire(payment.stripe_checkout_session_id) } catch { /* already completed or expired */ }
    }
  }

  const policy = { payment_policy_version: FREIGHT_BROKER_POLICY_VERSION, payment_policy_signature: input.paymentPolicySignature, payment_policy_accepted_at: new Date().toISOString(), payment_policy_text: FREIGHT_BROKER_POLICY_TEXT }
  const metadata = {
    program: FREIGHT_BROKER_PROGRAM.id,
    payment_type: FREIGHT_BROKER_PROGRAM.id,
    registration_no: registration.registration_no,
    freight_broker_registration_id: registration.id,
    class_id: registration.class.id,
    class_name: registration.class.name,
    attendance_type: registration.attendance_type,
    expected_amount: priceCents,
    policy_text: FREIGHT_BROKER_POLICY_TEXT,
    ...policy,
  }
  const { data: payment, error } = await db.from('payments').insert({
    broker_registration_id: registration.id,
    payer_name: `${registration.first_name} ${registration.last_name}`,
    payer_email: registration.email,
    description: `${FREIGHT_BROKER_PROGRAM.name} · ${registration.registration_no}`,
    amount_cents: priceCents, currency: 'USD', method: 'card', status: 'pending', provider: 'stripe', metadata,
  }).select('id').single()
  if (error) throw error

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: registration.registration_no,
    customer_email: registration.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: priceCents,
        product_data: { name: `${FREIGHT_BROKER_PROGRAM.name} Registration - ${registration.class.name}`, description: `Registration ${registration.registration_no} for the ${FREIGHT_BROKER_PROGRAM.name} at Iman Logistics` },
      },
    }],
    custom_text: { submit: { message: FREIGHT_BROKER_POLICY_TEXT } },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: checkoutReturnUrl('/freight-dispatch-masterclass/', { payment: 'success', session_id: '{CHECKOUT_SESSION_ID}' }),
    cancel_url: checkoutReturnUrl('/freight-dispatch-masterclass/', { payment: 'canceled', session_id: '{CHECKOUT_SESSION_ID}' }),
    metadata: {
      payment_id: payment.id,
      program: FREIGHT_BROKER_PROGRAM.id,
      payment_type: FREIGHT_BROKER_PROGRAM.id,
      freight_broker_registration_id: registration.id,
      registration_no: registration.registration_no,
      expected_amount: String(priceCents),
      app_email: registration.email,
      payment_policy_version: FREIGHT_BROKER_POLICY_VERSION,
    },
  })

  const { error: linkError } = await db.from('payments').update({ stripe_checkout_session_id: session.id }).eq('id', payment.id)
  if (linkError) throw linkError
  await db.from('freight_dispatch_masterclass_registrations').update(policy).eq('id', registration.id)
  res.json({ sessionId: session.id, url: session.url })
})

// ---------------------------------------------------------------------------
// Back office: class sessions (the dispatcher redesign's DispatcherClasses page)
// ---------------------------------------------------------------------------

freightBrokerAdminRoutes.get('/classes', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes_admin').select('*').order('starts_at', { ascending: false })
  if (error) throw error
  res.json(data)
})

freightBrokerAdminRoutes.post('/classes', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').insert(parse(freightBrokerClassInput, req.body)).select('*').single()
  if (error) throw error
  res.status(201).json(data)
})

freightBrokerAdminRoutes.put('/classes/:id', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').update(parse(freightBrokerClassInput, req.body)).eq('id', req.params.id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Class session not found.')
  res.json(data)
})

freightBrokerAdminRoutes.delete('/classes/:id', requireRole(superAdminOnly), async (req, res) => {
  const { count, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').delete({ count: 'exact' }).eq('id', req.params.id)
  if (error) throw error
  if (!count) throw new HttpError(404, 'Class session not found.')
  res.status(204).end()
})

freightBrokerAdminRoutes.get('/registrations/:id/notifications', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.from('notification_log').select('*').eq('entity_type', 'freight_dispatch_masterclass_registrations').eq('entity_id', req.params.id).order('created_at')
  if (error) throw error
  res.json(data)
})

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { isMasterclassProgram, MASTERCLASS_PROGRAMS, masterclassProgram, normalizePersonName } from '../../../src/features/freightBroker/program'
import { config } from '../config'
import { backOffice, requireRole, staff, superAdminOnly } from '../lib/auth'
import { classIsFull, loadRegistration, makeRegistrationNo, resendStudentConfirmation, sendRegistrationPaidNotifications } from '../lib/freightBroker'
import { HttpError, parse } from '../lib/http'
import { isMissingProgramSupport, programSupportRequired, warnMissingProgramSupport } from '../lib/programSupport'
import { consumeRegistrationVerification, normalizeVerificationPhone, resendRegistrationCode, startRegistrationVerification, verifyRegistrationCode } from '../lib/registrationVerification'
import { checkoutReturnUrl, stripeClient } from '../lib/stripe'
import { publicClient, serviceClient } from '../lib/supabase'
import { freightBrokerCheckout, freightBrokerClassInput, freightBrokerRegistration, registrationManualPayment, registrationTransfer, registrationVerificationCode, registrationVerificationResend, registrationVerificationStart } from '../schemas'

// Masterclass registration (Freight Dispatch Masterclass and Freight Broker
// Master Class): the Iman Trucking School dispatcher registration endpoints
// (/api/create-dispatcher-registration and /api/create-dispatcher-checkout),
// adapted to this API. Each class session belongs to one program; everything
// shown, signed, and charged follows the program of the session.

// Stripe needs an absolute, publicly reachable image. The Dispatch image is a
// Vite asset whose content hash is stable; the Broker logo is served from public/.
const checkoutImages = {
  dispatch_masterclass: '/assets/freight-dispatch-session-promo-CiPnRAQU.png',
  broker_masterclass: '/images/freight-broker-master-class.jpg',
} as const

export const freightBrokerRoutes = Router()
export const freightBrokerAdminRoutes = Router()

const submissions = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.submissionRateLimit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } })
const verificationRequests = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many verification requests. Please try again later.' } })
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
// Stored as E.164 so SMS opt-outs (keyed by the number Twilio reports) match.
const e164OrRaw = (value: string) => { try { return normalizeVerificationPhone(value) } catch { return value || null } }

freightBrokerRoutes.get('/classes', async (req, res) => {
  const program = isMasterclassProgram(req.query.program) ? req.query.program : 'dispatch_masterclass'
  let { data, error } = await publicClient().rpc('freight_broker_open_classes', { p_program: program })
  if (isMissingProgramSupport(error)) {
    // Older database: only Dispatch sessions exist, through the old function.
    warnMissingProgramSupport()
    ;({ data, error } = program === 'dispatch_masterclass' ? await publicClient().rpc('freight_broker_open_classes') : { data: [], error: null })
  }
  if (error) throw error
  // Always live: back-office edits must show on the website immediately.
  res.set('Cache-Control', 'no-store').json(data)
})

freightBrokerRoutes.post('/verifications', verificationRequests, async (req, res) => {
  const input = parse(registrationVerificationStart, req.body, 'Enter a valid email address.')
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
  const program = MASTERCLASS_PROGRAMS[input.program]
  const db = serviceClient()

  // Resolve exactly the session the student selected; never silently move a
  // verified registration to another class.
  const now = new Date().toISOString()
  let classRow: { id: string; allows_online: boolean; allows_in_person: boolean } | null = null
  if (isUuid(input.classId)) {
    const session = () => db.from('freight_dispatch_masterclass_classes').select('id, allows_online, allows_in_person').eq('id', input.classId).eq('status', 'OPEN').gte('ends_at', now)
    const { data, error } = await session().eq('program', program.id).maybeSingle()
    classRow = data
    // Older database: every session is a Dispatch session.
    if (isMissingProgramSupport(error) && program.id === 'dispatch_masterclass') classRow = (await session().maybeSingle()).data
  }
  if (!classRow) throw new HttpError(404, `The selected ${program.name} session is not available.`)
  if (input.attendanceType === 'online' && !classRow.allows_online) throw new HttpError(409, 'Online attendance is not available for this session.')
  if (input.attendanceType === 'in_person' && !classRow.allows_in_person) throw new HttpError(409, 'In-person attendance is not available for this session.')

  const email = input.email.toLowerCase()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await db.from('freight_dispatch_masterclass_registrations').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) throw new HttpError(429, 'Too many registrations. Please try again later.')
  const verification = await consumeRegistrationVerification(db, input.verificationId, input.verificationToken, email, input.phone)

  const row: Record<string, unknown> = {
    program: program.id,
    registration_no: makeRegistrationNo(program.id),
    first_name: input.firstName, last_name: input.lastName, email, phone: e164OrRaw(input.phone),
    address_line1: input.address1, address_line2: input.address2 || null, city: input.city, state: input.state, zip_code: input.zip,
    class_id: classRow.id, attendance_type: input.attendanceType,
    email_verified_at: verification.email_verified_at, phone_verified_at: verification.phone_verified_at, verification_id: verification.id,
    status: 'SUBMITTED', payment_status: 'pending',
    // A database trigger schedules SMS payment reminders when consent is given.
    ...(input.smsConsent
      ? { sms_consent_at: now, sms_consent_text: program.smsConsentText, sms_consent_declined_at: null }
      : { sms_consent_at: null, sms_consent_text: null, sms_consent_declined_at: now }),
  }
  let { data, error } = await db.from('freight_dispatch_masterclass_registrations').insert(row).select('id, registration_no, class_id, program').single()
  if (isMissingProgramSupport(error) && program.id === 'dispatch_masterclass') {
    const { program: _program, ...withoutProgram } = row
    const retry = await db.from('freight_dispatch_masterclass_registrations').insert(withoutProgram).select('id, registration_no, class_id').single()
    data = retry.data && { ...retry.data, program: program.id }
    error = retry.error
  }
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
  const program = masterclassProgram(registration.program)
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

  const policy = { payment_policy_version: program.policyVersion, payment_policy_signature: input.paymentPolicySignature, payment_policy_accepted_at: new Date().toISOString(), payment_policy_text: program.policyText }
  const metadata = {
    program: program.id,
    payment_type: program.id,
    registration_no: registration.registration_no,
    freight_broker_registration_id: registration.id,
    class_id: registration.class.id,
    class_name: registration.class.name,
    attendance_type: registration.attendance_type,
    expected_amount: priceCents,
    policy_text: program.policyText,
    ...policy,
  }
  const { data: payment, error } = await db.from('payments').insert({
    broker_registration_id: registration.id,
    payer_name: `${registration.first_name} ${registration.last_name}`,
    payer_email: registration.email,
    description: `${program.name} · ${registration.registration_no}`,
    amount_cents: priceCents, currency: 'USD', method: 'card', status: 'pending', provider: 'stripe', metadata,
  }).select('id').single()
  if (error) throw error

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'en',
    submit_type: 'pay',
    payment_method_types: ['card'],
    client_reference_id: registration.registration_no,
    customer_email: registration.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: priceCents,
        product_data: {
          name: `${program.name} Registration - ${registration.class.name}`,
          description: `${registration.attendance_type === 'online' ? 'Online / Zoom' : 'In Person'} attendance · Registration ${registration.registration_no} · Iman Logistics`,
          images: [`${config.appUrl.replace(/\/$/, '')}${checkoutImages[program.id]}`],
        },
      },
    }],
    custom_text: { submit: { message: program.policyText } },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: checkoutReturnUrl(program.path, { payment: 'success', session_id: '{CHECKOUT_SESSION_ID}' }),
    cancel_url: checkoutReturnUrl(program.path, { payment: 'canceled', session_id: '{CHECKOUT_SESSION_ID}' }),
    metadata: {
      payment_id: payment.id,
      program: program.id,
      payment_type: program.id,
      freight_broker_registration_id: registration.id,
      registration_no: registration.registration_no,
      expected_amount: String(priceCents),
      app_email: registration.email,
      payment_policy_version: program.policyVersion,
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
  const program = isMasterclassProgram(req.query.program) ? req.query.program : undefined
  const sessions = () => staff(req).db.from('freight_dispatch_masterclass_classes_admin').select('*')
  let { data, error } = await (program ? sessions().eq('program', program) : sessions()).order('starts_at', { ascending: false })
  if (isMissingProgramSupport(error)) {
    // Older database: every session is a Dispatch session.
    warnMissingProgramSupport()
    if (program === 'broker_masterclass') ({ data, error } = { data: [], error: null })
    else {
      ({ data, error } = await sessions().order('starts_at', { ascending: false }))
      data = data?.map(row => ({ ...row, program: 'dispatch_masterclass' })) ?? null
    }
  }
  if (error) throw error
  res.json(data)
})

freightBrokerAdminRoutes.post('/classes', requireRole(backOffice), async (req, res) => {
  const input = parse(freightBrokerClassInput, req.body)
  const program = input.program ?? 'dispatch_masterclass'
  let { data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').insert({ ...input, program }).select('*').single()
  if (isMissingProgramSupport(error)) {
    if (program !== 'dispatch_masterclass') throw programSupportRequired()
    const { program: _program, ...withoutProgram } = input
    ;({ data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').insert(withoutProgram).select('*').single())
  }
  if (error) throw error
  res.status(201).json(data)
})

freightBrokerAdminRoutes.put('/classes/:id', requireRole(backOffice), async (req, res) => {
  const input = parse(freightBrokerClassInput, req.body)
  let { data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').update(input).eq('id', req.params.id).select('*').maybeSingle()
  if (isMissingProgramSupport(error)) {
    if (input.program && input.program !== 'dispatch_masterclass') throw programSupportRequired()
    const { program: _program, ...withoutProgram } = input
    ;({ data, error } = await staff(req).db.from('freight_dispatch_masterclass_classes').update(withoutProgram).eq('id', req.params.id).select('*').maybeSingle())
  }
  if (error?.code === '23514') throw new HttpError(409, 'This class session already has registrations, so it cannot be moved to another masterclass.')
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

freightBrokerAdminRoutes.get('/registrations/:id/payment-reminders', requireRole(backOffice), async (req, res) => {
  const { db } = staff(req)
  const { data: registration } = await db.from('freight_dispatch_masterclass_registrations').select('phone').eq('id', req.params.id).maybeSingle()
  if (!registration) throw new HttpError(404, 'Registration not found.')
  const [schedule, reminders, optOut] = await Promise.all([
    db.from('payment_reminder_schedules').select('*').eq('registration_id', req.params.id).maybeSingle(),
    db.from('payment_reminders').select('*').eq('registration_id', req.params.id).order('attempt_number', { ascending: false }),
    registration.phone ? db.from('sms_opt_outs').select('*').eq('phone', registration.phone).maybeSingle() : { data: null, error: null },
  ])
  for (const result of [schedule, reminders, optOut]) if (result.error) throw result.error
  res.json({ schedule: schedule.data, reminders: reminders.data, optOut: optOut.data })
})

// Re-queue only a reminder that has definitively failed. The scheduler still
// re-reads registration/payment/consent/opt-out state immediately before the
// send, and the database guard prevents this update from reviving an
// ineligible registration. Accepted, in-flight, and retrying messages cannot
// be manually re-queued, which preserves the at-most-once guarantee.
freightBrokerAdminRoutes.post('/registrations/:id/payment-reminders/retry', requireRole(backOffice), async (req, res) => {
  const { db } = staff(req)
  const [scheduleResult, latestResult] = await Promise.all([
    db.from('payment_reminder_schedules').select('status').eq('registration_id', req.params.id).maybeSingle(),
    db.from('payment_reminders').select('status').eq('registration_id', req.params.id).eq('notification_type', 'payment_reminder').order('attempt_number', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (scheduleResult.error) throw scheduleResult.error
  if (latestResult.error) throw latestResult.error
  if (!scheduleResult.data) throw new HttpError(404, 'Payment reminder schedule not found.')
  if (latestResult.data?.status !== 'failed') throw new HttpError(409, 'Only a failed payment reminder can be retried.')
  if (scheduleResult.data.status !== 'scheduled') throw new HttpError(409, 'This payment reminder schedule is not active.')

  const { data, error } = await db.from('payment_reminder_schedules')
    .update({ next_reminder_at: new Date().toISOString(), locked_until: null, last_error: '' })
    .eq('registration_id', req.params.id)
    .eq('status', 'scheduled')
    .select('status, next_reminder_at')
    .maybeSingle()
  if (error) throw error
  if (!data || data.status !== 'scheduled' || !data.next_reminder_at) throw new HttpError(409, 'The registration is no longer eligible for SMS reminders.')
  res.json({ queued: true, nextReminderAt: data.next_reminder_at })
})

// ---------------------------------------------------------------------------
// Back office: staff actions on a registration
// ---------------------------------------------------------------------------

const REGISTRATIONS = 'freight_dispatch_masterclass_registrations'
const PAID_PAYMENT_FIELDS = 'id, broker_registration_id, amount_cents, paid_at, stripe_payment_intent_id, stripe_checkout_session_id'
const staffNote = (actor: string, text: string) => `[${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${actor}] ${text}`
const appendNote = (existing: unknown, line: string) => [String(existing ?? '').trim(), line].filter(Boolean).join('\n')

// Move a student to another session of the same masterclass, for example
// when the non-refundable payment is used as credit toward a later session.
freightBrokerAdminRoutes.post('/registrations/:id/transfer', requireRole(backOffice), async (req, res) => {
  const input = parse(registrationTransfer, req.body)
  const { db, staff: actor } = staff(req)
  const { data: registration } = await db.from(REGISTRATIONS).select('id, program, class_id, status, attendance_type, staff_notes, class:freight_dispatch_masterclass_classes(name)').eq('id', req.params.id).maybeSingle()
  if (!registration) throw new HttpError(404, 'Registration not found.')
  if (registration.status === 'CANCELED') throw new HttpError(409, 'This registration is canceled. Change its status before moving it.')
  if (registration.class_id === input.classId) throw new HttpError(409, 'The student is already in that session.')
  const { data: target } = await db.from('freight_dispatch_masterclass_classes').select('id, name, program, allows_online, allows_in_person').eq('id', input.classId).maybeSingle()
  if (!target) throw new HttpError(404, 'Class session not found.')
  const program = masterclassProgram(registration.program)
  if (target.program !== program.id) throw new HttpError(400, `Choose another ${program.name} session. Students can't be moved to a different masterclass.`)
  if (!input.allowFull && await classIsFull(db, target.id)) throw new HttpError(409, 'That session has no seats left. Tick "Move even if the session is full" to move the student anyway.')

  let attendance = registration.attendance_type
  if (attendance === 'online' && !target.allows_online) attendance = 'in_person'
  if (attendance === 'in_person' && !target.allows_in_person) attendance = 'online'
  const fromName = (registration.class as { name?: string } | null)?.name ?? 'no session'
  const note = staffNote(actor.email, `Moved from "${fromName}" to "${target.name}".${attendance !== registration.attendance_type ? ` Attendance changed to ${attendance === 'online' ? 'Online / Zoom' : 'In Person'}.` : ''}${input.note ? ` ${input.note}` : ''}`)
  // Staff may only edit status and notes directly, so the session change is
  // made by the server after the checks above; the note is written as the
  // staff member so the audit log shows who moved the student.
  const { data, error } = await serviceClient().from(REGISTRATIONS).update({ class_id: target.id, attendance_type: attendance }).eq('id', registration.id).select('id, class_id, attendance_type').single()
  if (error) throw error
  const { error: noteError } = await db.from(REGISTRATIONS).update({ staff_notes: appendNote(registration.staff_notes, note) }).eq('id', registration.id)
  if (noteError) throw noteError
  res.json(data)
})

// Record a payment received outside Stripe (cash, check, Zelle…). The payment
// trigger confirms the registration; then the usual confirmation goes out.
freightBrokerAdminRoutes.post('/registrations/:id/manual-payment', requireRole(backOffice), async (req, res) => {
  const input = parse(registrationManualPayment, req.body)
  const { db, staff: actor } = staff(req)
  const { data: registration } = await db.from(REGISTRATIONS).select('id, program, registration_no, first_name, last_name, email, status, payment_status, staff_notes').eq('id', req.params.id).maybeSingle()
  if (!registration) throw new HttpError(404, 'Registration not found.')
  if (registration.payment_status === 'paid') throw new HttpError(409, 'This registration is already paid.')
  if (registration.status === 'CANCELED') throw new HttpError(409, 'This registration is canceled. Change its status before recording a payment.')
  const program = masterclassProgram(registration.program)
  const { data: payment, error } = await db.from('payments').insert({
    broker_registration_id: registration.id,
    payer_name: `${registration.first_name} ${registration.last_name}`,
    payer_email: registration.email,
    description: `${program.name} · ${registration.registration_no} (recorded by staff)`,
    amount_cents: input.amount_cents, currency: 'USD', method: input.method, status: 'paid', provider: 'manual',
    provider_reference: input.provider_reference, admin_notes: input.note,
    metadata: { program: program.id, payment_type: program.id, recorded_by: actor.email },
  }).select(PAID_PAYMENT_FIELDS).single()
  if (error) throw error
  await db.from(REGISTRATIONS).update({ staff_notes: appendNote(registration.staff_notes, staffNote(actor.email, `Recorded a ${input.method.replace('_', ' ')} payment of $${(input.amount_cents / 100).toFixed(2)}${input.provider_reference ? ` (ref ${input.provider_reference})` : ''}.`)) }).eq('id', registration.id)
  let notificationError = ''
  if (input.sendConfirmation) {
    try { await sendRegistrationPaidNotifications(serviceClient(), registration.id, payment) } catch (caught) { notificationError = caught instanceof Error ? caught.message : 'Confirmation could not be sent.' }
  }
  res.status(201).json({ payment, notificationError })
})

freightBrokerAdminRoutes.post('/registrations/:id/resend-confirmation', requireRole(backOffice), async (req, res) => {
  const { db } = staff(req)
  const { data: registration } = await db.from(REGISTRATIONS).select('id, payment_status, payment_id').eq('id', req.params.id).maybeSingle()
  if (!registration) throw new HttpError(404, 'Registration not found.')
  if (registration.payment_status !== 'paid' || !registration.payment_id) throw new HttpError(409, 'Only a paid registration has a confirmation to resend.')
  const { data: payment } = await db.from('payments').select(PAID_PAYMENT_FIELDS).eq('id', registration.payment_id).maybeSingle()
  if (!payment) throw new HttpError(404, 'The payment for this registration was not found.')
  const delivery = await resendStudentConfirmation(serviceClient(), registration.id, payment)
  if (delivery.status !== 'sent') throw new HttpError(502, `The email was not sent: ${delivery.error || delivery.status}.`)
  res.json({ sent: true })
})

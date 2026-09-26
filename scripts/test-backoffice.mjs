// End-to-end check: website → Iman Logistics API → Supabase → back office.
//
// Runs against a LOCAL stack only:
//   npx supabase start && npx supabase db reset
//   docker run -d -p 12111:12111 stripe/stripe-mock      (optional, for Stripe checks)
//   npm run dev:api
//   node --env-file=.env.development.local scripts/test-backoffice.mjs
//
// It creates throwaway users and records, so never point it at production.
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const apiUrl = process.env.API_URL || 'http://localhost:3001'
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!url?.includes('127.0.0.1') && !url?.includes('localhost')) throw new Error('Refusing to run: SUPABASE_URL is not a local stack.')
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_API_HOST) throw new Error('Refusing to run: Stripe checks only run against stripe-mock (set STRIPE_API_HOST).')

const service = createClient(url, secretKey, { auth: { persistSession: false } })
const anon = createClient(url, publishableKey, { auth: { persistSession: false } })
const run = Date.now().toString(36)
let failures = 0
let passed = 0
const check = (name, condition, detail = '') => {
  if (condition) { passed += 1; console.log(`  ✓ ${name}`) }
  else { failures += 1; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}
const section = title => console.log(`\n${title}`)

async function call(path, { method, body, token, raw, headers = {} } = {}) {
  const response = await fetch(`${apiUrl}/api${path}`, {
    method: method ?? (body === undefined && raw === undefined ? 'GET' : 'POST'),
    headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  })
  const text = await response.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: response.status, json, text }
}

async function makeUser(role, label = role) {
  const email = `${label}-${run}@example.test`
  const password = `Test-${run}-password!`
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Test ${label}` } })
  if (error) throw error
  await service.from('profiles').update({ role, email, full_name: `Test ${label}` }).eq('id', data.user.id)
  const client = createClient(url, publishableKey, { auth: { persistSession: false } })
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return { id: data.user.id, email, client, token: session.session.access_token }
}

const usedDates = new Set()
const nextWeekday = () => {
  let date
  do {
    date = new Date()
    date.setUTCDate(date.getUTCDate() + 7 + Math.floor(Math.random() * 300))
    while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1)
  } while (usedDates.has(date.toISOString().slice(0, 10)))
  usedDates.add(date.toISOString().slice(0, 10))
  return date.toISOString().slice(0, 10)
}

const superAdmin = await makeUser('super_admin')
const admin = await makeUser('admin')
const employee = await makeUser('employee')
const customerEmail = `customer-${run}@example.test`
const bookingBody = (overrides = {}) => ({ serviceId: 'dispatch', date: nextWeekday(), time: '9:30 AM', timeZone: 'America/New_York', fullName: 'Jordan Customer', email: customerEmail, phone: '+1 555 010 2000', meetingType: 'Zoom', message: 'Looking for help starting a dispatch service business.', ...overrides })

section('API service and Swagger')
const health = await call('/health')
check('health check responds', health.status === 200 && health.json?.database === true, health.text)
const docs = await fetch(`${apiUrl}/api/docs/`)
check('Swagger UI is served at /api/docs', docs.ok && (await docs.text()).includes('swagger-ui'))
const spec = await call('/openapi.json')
check('OpenAPI document lists the endpoints', spec.json?.openapi === '3.1.0' && Object.keys(spec.json.paths).length >= 30, String(Object.keys(spec.json?.paths ?? {}).length))
check('unknown routes return JSON 404', (await call('/does-not-exist')).status === 404)
check('malformed JSON returns 400', (await call('/contact-submissions', { raw: '{bad' })).status === 400)

section('Website forms → API → database')
const contact = await call('/contact-submissions', { body: {
  fullName: 'Jordan Customer', email: customerEmail.toUpperCase(), phone: '+1 555 010 2000', subject: 'Dispatch training question',
  message: 'I would like to know more about the dispatch masterclass schedule.', preferredMethod: 'Email', service: 'Freight Dispatch Masterclass', consent: true,
  attachment: { name: 'notes.pdf', type: 'application/pdf', size: 12 },
} })
check('contact form returns 201 with a reference', contact.status === 201 && /^MSG-/.test(contact.json?.reference), contact.text)
const upload = await anon.storage.from('submission-files').uploadToSignedUrl(contact.json.upload.path, contact.json.upload.token, new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), { contentType: 'application/pdf' })
check('attachment uploads to private storage with the one-time token', !upload.error, upload.error?.message)
const { data: publicFile } = await anon.storage.from('submission-files').download(contact.json.upload.path)
check('anonymous visitors cannot download the attachment', !publicFile)
check('invalid input is rejected (400)', (await call('/contact-submissions', { body: { fullName: 'x', email: 'nope' } })).status === 400)
check('honeypot submissions are rejected (400)', (await call('/contact-submissions', { body: { fullName: 'Bot', email: 'bot@example.test', phone: '5550100000', subject: 'Hello', message: 'x'.repeat(30), consent: true, website: 'spam' } })).status === 400)
check('disallowed file types are rejected (400)', (await call('/contact-submissions', { body: { fullName: 'Jordan', email: `x${run}@example.test`, phone: '5550100000', subject: 'Hello', message: 'x'.repeat(30), consent: true, attachment: { name: 'a.exe', type: 'application/x-msdownload', size: 10 } } })).status === 400)

let firstBooking
let booking
do {
  firstBooking = bookingBody()
  booking = await call('/bookings', { body: firstBooking })
} while (booking.status === 409)
check('booking returns 201 with a reference', booking.status === 201 && /^BKG-/.test(booking.json?.reference), booking.text)
check('the same slot cannot be booked twice (409)', (await call('/bookings', { body: { ...firstBooking, email: `other-${run}@example.test` } })).status === 409)
check('invalid times are rejected (400)', (await call('/bookings', { body: bookingBody({ time: '3:00 AM' }) })).status === 400)
const availability = await call(`/bookings/availability?date=${firstBooking.date}`)
check('availability shows the slot as taken, without personal data', JSON.stringify(availability.json?.bookedTimes) === JSON.stringify(['9:30 AM']), availability.text)
const { data: storedBooking } = await service.from('consultation_bookings').select('id, price_cents, service_name, email').eq('reference', booking.json.reference).single()
check('booking price is set by the server catalog', storedBooking?.price_cents === 11900 && storedBooking.service_name === 'Dispatch Services Consultation')
check('emails are stored lowercased', storedBooking?.email === customerEmail)

const application = await call('/job-applications', { body: { position: 'CDL Class-A Driver', fullName: 'Jordan Customer', email: customerEmail, phone: '+1 555 010 2000', location: 'Atlanta, GA', experience: '3–5 years', coverLetter: 'Safe driver with regional experience.', resume: { name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048 } } })
check('job application returns 201 with a reference and upload slot', application.status === 201 && /^APP-/.test(application.json?.reference) && application.json.upload?.token)

const tracked = await call('/tracking/iman-12345')
check('public tracking finds a shipment case-insensitively', tracked.json?.reference === 'IMAN-12345')
check('public tracking hides internal fields', tracked.json && !('internal_notes' in tracked.json) && !('customer' in tracked.json) && !('carrier' in tracked.json))
check('unknown tracking references return 404', (await call('/tracking/NOPE-000')).status === 404)

section('Database stays locked for direct (non-API) access')
for (const table of ['contact_submissions', 'consultation_bookings', 'job_applications', 'payments', 'shipments', 'audit_logs', 'customers']) {
  const { data, error } = await anon.from(table).select('*').limit(1)
  check(`anonymous cannot read ${table}`, Boolean(error) || !data?.length, JSON.stringify(data))
}
const { error: anonInsert } = await anon.from('contact_submissions').insert({ full_name: 'Direct', email: 'direct@example.test', subject: 'x', message: 'x' })
check('anonymous cannot insert directly, bypassing the API', Boolean(anonInsert))

section('Authentication and roles')
check('admin endpoints require a token (401)', (await call('/admin/stats')).status === 401)
check('invalid tokens are rejected (401)', (await call('/admin/stats', { token: 'not-a-real-token' })).status === 401)
check('employees cannot use back-office endpoints (403)', (await call('/admin/contact-submissions', { token: employee.token })).status === 403)
const me = await call('/admin/me', { token: admin.token })
check('/admin/me returns the signed-in role', me.json?.role === 'admin' && me.json.email === admin.email)

section('Back office through the API')
const list = await call(`/admin/contact-submissions?search=${encodeURIComponent('Jordan')}&pageSize=10`, { token: admin.token })
const listed = list.json?.data?.find(row => row.reference === contact.json.reference)
check('list endpoint searches and paginates', list.status === 200 && Boolean(listed) && typeof list.json.total === 'number', list.text.slice(0, 200))
const contactId = listed?.id
check('status filter works', (await call('/admin/contact-submissions?status=resolved', { token: admin.token })).json?.data?.every(row => row.status === 'resolved'))
const updated = await call(`/admin/contact-submissions/${contactId}`, { method: 'PATCH', body: { status: 'in_progress', admin_notes: 'Called back.' }, token: admin.token })
check('admin can update status and internal notes', updated.status === 200 && updated.json?.status === 'in_progress', updated.text)
check('admin cannot edit what the customer submitted (400)', (await call(`/admin/contact-submissions/${contactId}`, { method: 'PATCH', body: { message: 'changed' }, token: admin.token })).status === 400)
check('admin cannot delete records (403)', (await call(`/admin/contact-submissions/${contactId}`, { method: 'DELETE', token: admin.token })).status === 403)
const signed = await call(`/admin/files/signed-url?path=${encodeURIComponent(contact.json.upload.path)}`, { token: admin.token })
check('admin gets a short-lived link to the attachment', signed.status === 200 && (await fetch(signed.json.url)).ok, signed.text)
check('file paths are validated (400)', (await call('/admin/files/signed-url?path=../../etc/passwd', { token: admin.token })).status === 400)
const stats = await call('/admin/stats', { token: admin.token })
check('dashboard statistics load', stats.status === 200 && stats.json.contacts.total >= 1 && stats.json.daily.length === 14, stats.text.slice(0, 200))
check('recent activity loads', Array.isArray((await call('/admin/recent-activity', { token: admin.token })).json))

const manual = await call('/admin/payments', { body: { payer_name: 'Jordan Customer', payer_email: customerEmail, description: 'Dispatch consultation', amount_cents: 11900, method: 'zelle', status: 'paid', booking_reference: booking.json.reference }, token: admin.token })
check('admin records a manual payment', manual.status === 201, manual.text)
const paidBooking = await call(`/admin/bookings/${storedBooking.id}`, { token: admin.token })
check('a paid payment marks the linked booking paid and confirmed', paidBooking.json?.payment_status === 'paid' && paidBooking.json.status === 'confirmed', paidBooking.text.slice(0, 200))
const customer = await call(`/admin/customers/${encodeURIComponent(customerEmail)}`, { token: admin.token })
check('customers view combines all activity for one person', customer.json?.contact_count === 1 && customer.json.booking_count >= 1 && customer.json.application_count === 1 && Number(customer.json.total_paid_cents) === 11900, customer.text)
const activity = await call(`/admin/customers/${encodeURIComponent(customerEmail)}/activity`, { token: admin.token })
check('customer activity lists their records', activity.json?.contacts?.length === 1 && activity.json.payments.length === 1)

const shipment = await call('/admin/shipments', { body: { reference: `test-${run}`, status: 'In transit', origin: 'Orlando, FL', destination: 'Savannah, GA', progress: 40, internalNotes: 'secret' }, token: admin.token })
check('admin creates shipments', shipment.status === 201 && shipment.json.reference === `TEST-${run}`.toUpperCase(), shipment.text)
check('new shipments appear in public tracking', (await call(`/tracking/TEST-${run.toUpperCase()}`)).json?.progress === 40)
check('admin cannot read the audit log (403)', (await call('/admin/audit-logs', { token: admin.token })).status === 403)

section('Work orders through the API')
const order = await call('/work-orders', { body: { work_order_number: `WO-${run}`, title: 'Confirm delivery', description: 'Call the receiver.', assignee_id: employee.id, priority: 'High', status: 'Open', due_date: firstBooking.date, delivery_appointment: '2026-10-05T10:00', notes: [{ id: 'n1', author: 'Test super_admin', message: 'original', createdAt: 'now', kind: 'Progress note' }] }, token: superAdmin.token })
check('super admin creates a work order', order.status === 201, order.text)
check('admins cannot create work orders (403)', (await call('/work-orders', { body: {}, token: admin.token })).status === 403)
const employeeOrders = await call('/work-orders', { token: employee.token })
check('employee sees their assigned order with its assignee name', employeeOrders.json?.some(row => row.id === order.json.id && row.assignee_name === 'Test employee'))
const note = (message, id) => ({ id, author: 'Test employee', message, createdAt: 'now', kind: 'Progress note' })
const rewrite = await call(`/work-orders/${order.json.id}/progress`, { body: { status: 'In progress', notes: [note('rewritten', 'n1')], statusHistory: [] }, token: employee.token })
check('employee cannot rewrite existing notes (400)', rewrite.status === 400, rewrite.text)
const append = await call(`/work-orders/${order.json.id}/progress`, { body: { status: 'In progress', notes: [order.json.notes[0], note('added', 'n2')], statusHistory: [{ id: 'h1', status: 'In progress', actor: 'Test employee', createdAt: 'now' }] }, token: employee.token })
check('employee can append notes and history', append.status === 200, append.text)
check('employees cannot mark work orders Completed (400)', (await call(`/work-orders/${order.json.id}/progress`, { body: { status: 'Completed', notes: [], statusHistory: [] }, token: employee.token })).status === 400)

section('Website content through the API')
const publicContent = await call('/site-content')
check('public content lists only published sections', publicContent.status === 200 && publicContent.json.length > 0 && publicContent.json.every(row => row.published))
const created = await call('/admin/site-content', { body: { page: 'home', section_key: `custom-${run}`, title: 'Hidden draft', published: false }, token: superAdmin.token })
check('super admin creates a content section', created.status === 201, created.text)
check('unpublished sections stay off the public site', !(await call('/site-content')).json.some(row => row.id === created.json.id))
check('admins cannot edit website content (403)', (await call('/admin/site-content', { token: admin.token })).status === 403)
const image = await call('/admin/site-content/image-uploads', { body: { name: 'hero.png', type: 'image/png', size: 1024 }, token: superAdmin.token })
check('image uploads get a one-time token and public URL', image.status === 201 && image.json.publicUrl.includes('website-media'), image.text)
check('super admin deletes the section (204)', (await call(`/admin/site-content/${created.json.id}`, { method: 'DELETE', token: superAdmin.token })).status === 204)

section('Super admin, users, and audit log')
check('super admin can delete records (204)', (await call(`/admin/contact-submissions/${contactId}`, { method: 'DELETE', token: superAdmin.token })).status === 204)
const audit = await call(`/admin/audit-logs?search=${contactId}`, { token: superAdmin.token })
check('audit log records create, update, and delete for the record', ['insert', 'update', 'delete'].every(action => audit.json?.data?.some(row => row.action === action)), JSON.stringify(audit.json?.data?.map(row => row.action)))
check('audit log names the admin who changed the status', audit.json?.data?.some(row => row.action === 'update' && row.actor_email === admin.email && row.changes.status?.new === 'in_progress'))
check('admins cannot manage users (403)', (await call('/admin/users', { token: admin.token })).status === 403)
const newUser = await call('/admin/users', { body: { fullName: 'New Admin', email: `new-admin-${run}@example.test`, password: 'long-enough-1', role: 'admin' }, token: superAdmin.token })
check('super admin creates an admin account', newUser.status === 201, newUser.text)
check('the new account appears with the admin role', (await call('/admin/users', { token: superAdmin.token })).json?.some(user => user.id === newUser.json.id && user.role === 'admin'))
check('short passwords are rejected (400)', (await call(`/admin/users/${newUser.json.id}`, { method: 'PATCH', body: { password: 'short' }, token: superAdmin.token })).status === 400)
const otherSuper = await makeUser('super_admin', 'second-super-admin')
check('another super admin cannot be changed (403)', (await call(`/admin/users/${otherSuper.id}`, { method: 'PATCH', body: { active: false }, token: superAdmin.token })).status === 403)
check('a role change is saved', (await call(`/admin/users/${newUser.json.id}`, { method: 'PATCH', body: { role: 'employee' }, token: superAdmin.token })).status === 200)
const userAudit = await call(`/admin/audit-logs?search=${newUser.json.id}&entity_type=profiles`, { token: superAdmin.token })
check('user management actions are audited', ['user.create', 'user.update'].every(action => userAudit.json?.data?.some(row => row.action === action)))
check('users can be deleted (204)', (await call(`/admin/users/${newUser.json.id}`, { method: 'DELETE', token: superAdmin.token })).status === 204)
const reset = await call('/auth/password-reset', { body: { email: superAdmin.email } })
const resetUnknown = await call('/auth/password-reset', { body: { email: `nobody-${run}@example.test` } })
check('password reset gives the same reply for known and unknown emails', reset.status === 200 && reset.json?.message === resetUnknown.json?.message)

if (process.env.STRIPE_SECRET_KEY) {
  section('Stripe Checkout and webhooks (stripe-mock)')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sendEvent = (type, object, secret = process.env.STRIPE_WEBHOOK_SECRET) => {
    const payload = JSON.stringify({ id: `evt_${crypto.randomUUID().replaceAll('-', '')}`, object: 'event', type, data: { object } })
    return call('/stripe/webhook', { raw: payload, headers: { 'Stripe-Signature': stripe.webhooks.generateTestHeaderString({ payload, secret }) } })
  }
  // stripe-mock returns the same fixture session id every time, so each test
  // payment gets a unique id before its webhook events are simulated.
  const startCheckout = async () => {
    // Earlier runs leave bookings behind, so retry until a free slot is found.
    let body
    let created
    do {
      body = bookingBody({ email: `stripe-${crypto.randomUUID().slice(0, 8)}@example.test` })
      created = await call('/bookings', { body })
    } while (created.status === 409)
    const checkout = await call(`/bookings/${created.json.reference}/checkout`, { body: { email: body.email, paymentPolicyAccepted: true, paymentPolicySignature: 'jordan  CUSTOMER' } })
    const { data: payment } = await service.from('payments').select('*').eq('description', `Dispatch Services Consultation · ${created.json.reference}`).eq('status', 'pending').single()
    const sessionId = `cs_test_${crypto.randomUUID().replaceAll('-', '')}`
    if (payment) await service.from('payments').update({ stripe_checkout_session_id: sessionId }).eq('id', payment.id)
    return { body, reference: created.json.reference, checkout, payment, sessionId }
  }
  const session = (flow, overrides = {}) => ({ id: flow.sessionId, object: 'checkout.session', payment_status: 'paid', status: 'complete', amount_total: 11900, currency: 'usd', payment_intent: `pi_${flow.payment.id.replaceAll('-', '')}`, metadata: { payment_id: flow.payment.id }, ...overrides })
  const paymentRow = async id => (await service.from('payments').select('*').eq('id', id).single()).data
  const bookingRow = async reference => (await service.from('consultation_bookings').select('*').eq('reference', reference).single()).data

  check('the site is told online payment is available', (await call('/public-config')).json?.onlinePayments === true)
  const paid = await startCheckout()
  check('checkout returns a Stripe Checkout URL', paid.checkout.status === 200 && paid.checkout.json.url?.startsWith('https://'), paid.checkout.text)
  check('a pending Stripe payment is recorded with the server price', paid.payment?.provider === 'stripe' && paid.payment.amount_cents === 11900)
  check('the signed payment policy is stored on the booking', (await bookingRow(paid.reference)).payment_policy_signature === 'jordan  CUSTOMER')
  check('checkout rejects a mismatched email (400)', (await call(`/bookings/${paid.reference}/checkout`, { body: { email: 'someone@example.test', paymentPolicyAccepted: true, paymentPolicySignature: 'Jordan Customer' } })).status === 400)
  check('checkout requires the policy to be signed with the booking name (400)', (await call(`/bookings/${paid.reference}/checkout`, { body: { email: paid.body.email, paymentPolicyAccepted: true, paymentPolicySignature: 'Someone Else' } })).status === 400)

  check('webhooks with a bad signature are rejected (400)', (await sendEvent('checkout.session.completed', session(paid), 'whsec_wrong')).status === 400)
  check('checkout.session.completed is accepted', (await sendEvent('checkout.session.completed', session(paid))).status === 200)
  const afterPaid = await paymentRow(paid.payment.id)
  check('the payment is marked paid with the Stripe payment id', afterPaid.status === 'paid' && afterPaid.stripe_payment_intent_id === session(paid).payment_intent && Boolean(afterPaid.paid_at), afterPaid.status)
  const confirmedBooking = await bookingRow(paid.reference)
  check('the booking becomes paid and confirmed', confirmedBooking.payment_status === 'paid' && confirmedBooking.status === 'confirmed', `${confirmedBooking.payment_status} ${confirmedBooking.status}`)
  await sendEvent('checkout.session.completed', session(paid))
  check('repeated events are harmless (idempotent)', (await paymentRow(paid.payment.id)).status === 'paid')
  const status = await call(`/payments/status?session_id=${paid.sessionId}`)
  check('the return page reports success with booking details', status.json?.status === 'succeeded' && status.json.booking?.reference === paid.reference, status.text)
  check('paid bookings cannot start another checkout (400)', (await call(`/bookings/${paid.reference}/checkout`, { body: { email: paid.body.email, paymentPolicyAccepted: true, paymentPolicySignature: 'Jordan Customer' } })).status === 400)
  check('staff cannot edit a Stripe payment (403)', (await call(`/admin/payments/${paid.payment.id}`, { method: 'PUT', body: { payer_name: 'X Y', amount_cents: 1 }, token: admin.token })).status === 403)
  const statusChange = await call(`/admin/payments/${paid.payment.id}`, { method: 'PATCH', body: { status: 'refunded' }, token: admin.token })
  check('staff cannot change a Stripe payment status (403)', statusChange.status === 403, statusChange.text)
  check('staff can still add notes to a Stripe payment', (await call(`/admin/payments/${paid.payment.id}`, { method: 'PATCH', body: { admin_notes: 'Customer called.' }, token: admin.token })).status === 200)

  await sendEvent('charge.refunded', { id: 'ch_test', object: 'charge', refunded: true, amount_refunded: 11900, currency: 'usd', payment_intent: session(paid).payment_intent })
  check('charge.refunded marks the payment and booking refunded', (await paymentRow(paid.payment.id)).status === 'refunded' && (await bookingRow(paid.reference)).payment_status === 'refunded')

  const mismatch = await startCheckout()
  await sendEvent('checkout.session.completed', session(mismatch, { amount_total: 100 }))
  const mismatched = await paymentRow(mismatch.payment.id)
  check('an amount mismatch is marked failed, not paid', mismatched.status === 'failed' && mismatched.error_message.includes('mismatch'), mismatched.status)

  const abandoned = await startCheckout()
  await sendEvent('checkout.session.expired', session(abandoned, { payment_status: 'unpaid', status: 'expired' }))
  const released = await bookingRow(abandoned.reference)
  check('an expired checkout cancels the payment and releases the time slot', (await paymentRow(abandoned.payment.id)).status === 'canceled' && released.status === 'cancelled' && released.payment_status === 'unpaid', `${released.status} ${released.payment_status}`)
  check('the released slot can be booked again', (await call('/bookings', { body: { ...abandoned.body, email: `rebook-${run}@example.test` } })).status === 201)

  const retried = await startCheckout()
  const second = await call(`/bookings/${retried.reference}/checkout`, { body: { email: retried.body.email, paymentPolicyAccepted: true, paymentPolicySignature: 'Jordan Customer' } })
  const superseded = await paymentRow(retried.payment.id)
  check('retrying checkout cancels the earlier open session', superseded.status === 'canceled' && superseded.metadata.superseded === true, `${second.status} ${superseded.status} ${second.text}`)
  await sendEvent('checkout.session.expired', session(retried, { payment_status: 'unpaid', status: 'expired' }))
  check('the replaced session expiring does not release the booking', (await bookingRow(retried.reference)).status === 'pending')
} else {
  console.log('\n(Stripe checks skipped: STRIPE_SECRET_KEY is not set.)')
}

console.log(failures ? `\n${failures} of ${passed + failures} checks failed.` : `\nAll ${passed} checks passed.`)
process.exit(failures ? 1 : 0)

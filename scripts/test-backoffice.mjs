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

  section('Freight Broker Masterclass: page → registration → payment → notifications → back office')
  const mockUrl = process.env.MOCK_NOTIFICATIONS_URL || 'http://localhost:4010'
  const captured = async () => (await fetch(`${mockUrl}/captured`)).json()
  await fetch(`${mockUrl}/captured`, { method: 'DELETE' })

  const classes = await call('/freight-broker/classes')
  const rolling = classes.json?.find(item => item.name.startsWith('Freight Broker Masterclass'))
  check('the page lists open Freight Broker class sessions with price', classes.status === 200 && rolling?.price_cents === 52000, classes.text.slice(0, 200))
  check('public class data exposes no registrations', rolling && !('registrations' in rolling) && 'seats_remaining' in rolling)

  const registrant = { firstName: 'Taylor', lastName: `Broker <b>${run}</b>`, email: `broker-${run}@example.test`, phone: '+1 555 010 7000', address1: '100 Main St', address2: 'Suite 5', city: 'Orlando', state: 'FL', zip: '32801', classId: rolling.id }
  check('registration requires the address fields (400)', (await call('/freight-broker/registrations', { body: { ...registrant, address1: '' } })).status === 400)
  check('registration rejects bots (400)', (await call('/freight-broker/registrations', { body: { ...registrant, website: 'spam' } })).status === 400)
  const reg = await call('/freight-broker/registrations', { body: registrant })
  check('step 1 creates a registration with an FBM number', reg.status === 201 && /^FBM-\d{4}-/.test(reg.json?.registration_no) && reg.json.class_id === rolling.id, reg.text)
  const regRow = async () => (await service.from('freight_broker_registrations').select('*').eq('id', reg.json.id).single()).data
  const initial = await regRow()
  check('the registration is SUBMITTED with payment pending', initial.status === 'SUBMITTED' && initial.payment_status === 'pending' && initial.email === registrant.email)
  check('anonymous users cannot read registrations directly', !((await anon.from('freight_broker_registrations').select('id').limit(1)).data?.length))

  const signature = `taylor  broker <b>${run}</b>`
  const checkoutBody = { email: registrant.email, classId: rolling.id, paymentPolicyAccepted: true, paymentPolicySignature: signature }
  check('checkout requires accepting the policy (400)', (await call(`/freight-broker/registrations/${reg.json.id}/checkout`, { body: { ...checkoutBody, paymentPolicyAccepted: false } })).status === 400)
  check('checkout requires the signature to match the registrant (400)', (await call(`/freight-broker/registrations/${reg.json.id}/checkout`, { body: { ...checkoutBody, paymentPolicySignature: 'Someone Else' } })).status === 400)
  check('checkout rejects a mismatched email (400)', (await call(`/freight-broker/registrations/${reg.json.id}/checkout`, { body: { ...checkoutBody, email: 'other@example.test' } })).status === 400)
  check('checkout rejects a different class than registered (409)', (await call(`/freight-broker/registrations/${reg.json.id}/checkout`, { body: { ...checkoutBody, classId: crypto.randomUUID() } })).status === 409)
  const brokerCheckout = await call(`/freight-broker/registrations/${reg.json.id}/checkout`, { body: checkoutBody })
  check('step 2 returns a Stripe Checkout URL', brokerCheckout.status === 200 && brokerCheckout.json?.url?.startsWith('https://'), brokerCheckout.text)
  const { data: brokerPayment } = await service.from('payments').select('*').eq('broker_registration_id', reg.json.id).eq('status', 'pending').single()
  check('the payment is priced from the class and tagged Freight Broker Masterclass', brokerPayment?.amount_cents === 52000 && brokerPayment.provider === 'stripe' && brokerPayment.metadata.program === 'freight_broker_masterclass' && brokerPayment.metadata.registration_no === reg.json.registration_no && brokerPayment.description.startsWith('Freight Broker Masterclass'), JSON.stringify(brokerPayment?.metadata))
  const afterCheckout = await regRow()
  check('the signed policy is recorded on the registration', afterCheckout.payment_policy_signature === signature && afterCheckout.payment_policy_version === 'v1-freight-broker-nonrefundable-credit-schoolcancel' && Boolean(afterCheckout.payment_policy_accepted_at))
  const brokerSession = `cs_test_${crypto.randomUUID().replaceAll('-', '')}`
  await service.from('payments').update({ stripe_checkout_session_id: brokerSession }).eq('id', brokerPayment.id)
  const brokerEvent = { id: brokerSession, object: 'checkout.session', payment_status: 'paid', status: 'complete', amount_total: 52000, currency: 'usd', payment_intent: `pi_${brokerPayment.id.replaceAll('-', '')}`, metadata: { payment_id: brokerPayment.id, program: 'freight_broker_masterclass' } }
  check('the Stripe webhook accepts the paid session', (await sendEvent('checkout.session.completed', brokerEvent)).status === 200)
  const confirmedReg = await regRow()
  check('payment confirms the registration (CONFIRMED + paid)', confirmedReg.status === 'CONFIRMED' && confirmedReg.payment_status === 'paid' && confirmedReg.payment_id === brokerPayment.id, `${confirmedReg.status} ${confirmedReg.payment_status}`)
  await sendEvent('payment_intent.succeeded', { id: brokerEvent.payment_intent, object: 'payment_intent', amount: 52000, amount_received: 52000, currency: 'usd' })
  await sendEvent('checkout.session.completed', brokerEvent)

  const messages = await captured()
  const customerEmail = messages.find(message => message.channel === 'email' && message.to === registrant.email)
  const staffEmail = messages.find(message => message.channel === 'email' && message.to === process.env.FREIGHT_BROKER_NOTIFY_EMAIL)
  const sms = messages.find(message => message.channel === 'sms')
  check('the registrant receives a confirmation email', customerEmail?.subject === `Freight Broker Masterclass Registration Confirmed - ${reg.json.registration_no}` && customerEmail.html.includes('$520.00') && customerEmail.html.includes('Freight Broker Masterclass'), customerEmail?.subject)
  check('the email includes the signed policy', customerEmail?.html.includes('Electronically signed by') && customerEmail.html.includes('v1-freight-broker-nonrefundable-credit-schoolcancel'))
  check('registrant-typed HTML is escaped in emails', customerEmail && !customerEmail.html.includes(`<b>${run}</b>`) && customerEmail.html.includes(`&lt;b&gt;${run}&lt;/b&gt;`))
  check('the department receives a paid-registration email', staffEmail?.subject === `New Freight Broker Masterclass Registration Paid - ${reg.json.registration_no}` && staffEmail.html.includes(registrant.email) && staffEmail.html.includes('/admin/freight-broker/'), staffEmail?.subject)
  check('the registrant receives an SMS confirmation', sms?.to === registrant.phone && sms.body.includes(reg.json.registration_no) && sms.body.includes('Freight Broker Masterclass'), sms?.body)
  check('duplicate Stripe events do not send duplicate notifications', messages.length === 3, String(messages.length))
  const { data: logged } = await service.from('notification_log').select('channel, status, template').eq('entity_id', reg.json.id)
  check('all three notifications are logged as sent', logged?.length === 3 && logged.every(row => row.status === 'sent'), JSON.stringify(logged))

  const returnPage = await call(`/payments/status?session_id=${brokerSession}`)
  check('the return page shows the confirmed registration', returnPage.json?.status === 'succeeded' && returnPage.json.payment_type === 'freight_broker_masterclass' && returnPage.json.registration?.registrationNo === reg.json.registration_no && returnPage.json.registration.className === rolling.name, returnPage.text.slice(0, 300))
  check('a paid registration cannot be charged again (400)', (await call(`/freight-broker/registrations/${reg.json.id}/checkout`, { body: checkoutBody })).status === 400)

  const adminList = await call(`/admin/freight-broker-registrations?search=${encodeURIComponent(reg.json.registration_no)}`, { token: admin.token })
  check('the back office lists the registration with its class', adminList.json?.data?.[0]?.id === reg.json.id && adminList.json.data[0].class?.name === rolling.name, adminList.text.slice(0, 200))
  check('staff can filter registrations by payment status', (await call('/admin/freight-broker-registrations?payment_status=paid', { token: admin.token })).json?.data?.every(row => row.payment_status === 'paid'))
  const review = await call(`/admin/freight-broker-registrations/${reg.json.id}`, { method: 'PATCH', body: { staff_notes: 'Sent course access.' }, token: admin.token })
  check('staff can add notes to a registration', review.status === 200 && review.json.staff_notes === 'Sent course access.', review.text)
  check('staff cannot change payment fields (400)', (await call(`/admin/freight-broker-registrations/${reg.json.id}`, { method: 'PATCH', body: { payment_status: 'refunded' }, token: admin.token })).status === 400)
  check('employees cannot see registrations (403)', (await call('/admin/freight-broker-registrations', { token: employee.token })).status === 403)
  const regNotifications = await call(`/admin/freight-broker/registrations/${reg.json.id}/notifications`, { token: admin.token })
  check('staff can see the notifications sent for the registration', regNotifications.json?.length === 3)
  check('the notification log is searchable in the back office', (await call(`/admin/notification-log?search=${encodeURIComponent(registrant.email)}`, { token: admin.token })).json?.total === 1)
  const brokerPaymentAdmin = await call(`/admin/payments/${brokerPayment.id}`, { token: admin.token })
  check('the payment shows its Freight Broker registration in the back office', brokerPaymentAdmin.json?.registration?.registration_no === reg.json.registration_no && brokerPaymentAdmin.json.status === 'paid')
  const brokerCustomer = await call(`/admin/customers/${encodeURIComponent(registrant.email)}`, { token: admin.token })
  check('the customer record counts the registration and payment', brokerCustomer.json?.registration_count === 1 && Number(brokerCustomer.json.total_paid_cents) === 52000, brokerCustomer.text)
  const brokerStats = await call('/admin/stats', { token: admin.token })
  check('dashboard statistics include Freight Broker registrations', brokerStats.json?.brokerRegistrations?.confirmed >= 1)
  const brokerAudit = await call(`/admin/audit-logs?search=${reg.json.id}&entity_type=freight_broker_registrations`, { token: superAdmin.token })
  check('registration changes are in the audit log', ['insert', 'update'].every(action => brokerAudit.json?.data?.some(row => row.action === action)))

  // Seats: a one-seat class fills after one paid registration.
  const seatClass = await call('/admin/freight-broker/classes', { body: { name: `Test cohort ${run}`, price_cents: 49900, starts_at: '2026-11-02T14:00:00Z', ends_at: '2026-11-20T22:00:00Z', location: 'Online', schedule_notes: 'Mon–Thu evenings', seat_capacity: 1, open: true }, token: admin.token })
  check('staff create a class session with seats', seatClass.status === 201, seatClass.text)
  check('employees cannot manage class sessions (403)', (await call('/admin/freight-broker/classes', { token: employee.token })).status === 403)
  const firstSeat = await call('/freight-broker/registrations', { body: { ...registrant, email: `seat1-${run}@example.test`, lastName: 'One', classId: seatClass.json.id } })
  const secondSeat = await call('/freight-broker/registrations', { body: { ...registrant, email: `seat2-${run}@example.test`, lastName: 'Two', classId: seatClass.json.id } })
  await call(`/freight-broker/registrations/${firstSeat.json.id}/checkout`, { body: { email: `seat1-${run}@example.test`, paymentPolicyAccepted: true, paymentPolicySignature: 'Taylor One' } })
  const { data: seatPayment } = await service.from('payments').select('*').eq('broker_registration_id', firstSeat.json.id).eq('status', 'pending').single()
  check('checkout charges that session’s own price', seatPayment?.amount_cents === 49900)
  const seatSession = `cs_test_${crypto.randomUUID().replaceAll('-', '')}`
  await service.from('payments').update({ stripe_checkout_session_id: seatSession }).eq('id', seatPayment.id)
  await sendEvent('checkout.session.completed', { id: seatSession, object: 'checkout.session', payment_status: 'paid', status: 'complete', amount_total: 49900, currency: 'usd', payment_intent: `pi_${seatPayment.id.replaceAll('-', '')}`, metadata: { payment_id: seatPayment.id } })
  const seatList = (await call('/freight-broker/classes')).json?.find(item => item.id === seatClass.json.id)
  check('seats remaining drop to 0 after the paid registration', seatList?.seats_remaining === 0, JSON.stringify(seatList))
  check('checkout is refused once the class is full (409)', (await call(`/freight-broker/registrations/${secondSeat.json.id}/checkout`, { body: { email: `seat2-${run}@example.test`, paymentPolicyAccepted: true, paymentPolicySignature: 'Taylor Two' } })).status === 409)

  // Abandoned checkout: the registration stays SUBMITTED, payment canceled.
  const abandonedReg = await call('/freight-broker/registrations', { body: { ...registrant, email: `abandon-${run}@example.test`, classId: rolling.id } })
  await call(`/freight-broker/registrations/${abandonedReg.json.id}/checkout`, { body: { email: `abandon-${run}@example.test`, paymentPolicyAccepted: true, paymentPolicySignature: signature } })
  const { data: abandonedPayment } = await service.from('payments').select('*').eq('broker_registration_id', abandonedReg.json.id).eq('status', 'pending').single()
  const abandonedSession = `cs_test_${crypto.randomUUID().replaceAll('-', '')}`
  await service.from('payments').update({ stripe_checkout_session_id: abandonedSession }).eq('id', abandonedPayment.id)
  await sendEvent('checkout.session.expired', { id: abandonedSession, object: 'checkout.session', payment_status: 'unpaid', status: 'expired', amount_total: 52000, currency: 'usd', payment_intent: null, metadata: { payment_id: abandonedPayment.id } })
  const abandonedRow = (await service.from('freight_broker_registrations').select('status, payment_status').eq('id', abandonedReg.json.id).single()).data
  check('an expired checkout marks the registration payment canceled', abandonedRow.status === 'SUBMITTED' && abandonedRow.payment_status === 'canceled', JSON.stringify(abandonedRow))
  check('the registrant can retry payment after canceling', (await call(`/freight-broker/registrations/${abandonedReg.json.id}/checkout`, { body: { email: `abandon-${run}@example.test`, paymentPolicyAccepted: true, paymentPolicySignature: signature } })).status === 200)
  check('no notifications are sent for unpaid registrations', (await service.from('notification_log').select('id').eq('entity_id', abandonedReg.json.id)).data?.length === 0)
  check('the consultation booking flow is unaffected', (await call('/public-config')).json?.onlinePayments === true)
  // Close the throwaway class so it does not show on the public page.
  await call(`/admin/freight-broker/classes/${seatClass.json.id}`, { method: 'PUT', body: { name: `Test cohort ${run}`, price_cents: 49900, starts_at: '2026-11-02T14:00:00Z', ends_at: '2026-11-20T22:00:00Z', seat_capacity: 1, open: false }, token: admin.token })
} else {
  console.log('\n(Stripe checks skipped: STRIPE_SECRET_KEY is not set.)')
}

console.log(failures ? `\n${failures} of ${passed + failures} checks failed.` : `\nAll ${passed} checks passed.`)
process.exit(failures ? 1 : 0)

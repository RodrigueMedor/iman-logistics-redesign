// End-to-end check of website forms → Netlify Functions → Supabase → back office.
//
// Runs against a LOCAL stack only:
//   npx supabase start && npx supabase db reset
//   netlify dev --port 8888
//   node --env-file=.env.development.local scripts/test-backoffice.mjs
//
// It creates throwaway users and records, so never point it at production.
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.SITE_URL || 'http://localhost:8888'
const url = process.env.SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!url?.includes('127.0.0.1') && !url?.includes('localhost')) throw new Error('Refusing to run: SUPABASE_URL is not a local stack.')

const service = createClient(url, secretKey, { auth: { persistSession: false } })
const anon = createClient(url, publishableKey, { auth: { persistSession: false } })
const run = Date.now().toString(36)
let failures = 0
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ✓ ${name}`)
  else { failures += 1; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}
const section = title => console.log(`\n${title}`)

async function post(name, body, { method = 'POST', token } = {}) {
  const response = await fetch(`${siteUrl}/.netlify/functions/${name}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: response.status, json }
}

async function makeUser(role, label = role) {
  const email = `${label}-${run}@example.test`
  const password = `Test-${run}-password!`
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Test ${role}` } })
  if (error) throw error
  await service.from('profiles').update({ role, email, full_name: `Test ${role}` }).eq('id', data.user.id)
  const client = createClient(url, publishableKey, { auth: { persistSession: false } })
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return { id: data.user.id, email, client, token: session.session.access_token }
}

const nextWeekday = offset => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offset)
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

const superAdmin = await makeUser('super_admin')
const admin = await makeUser('admin')
const employee = await makeUser('employee')
const customerEmail = `customer-${run}@example.test`

section('Public website forms → Netlify Functions → database')
const contact = await post('submit-contact', {
  fullName: 'Jordan Customer', email: customerEmail.toUpperCase(), phone: '+1 555 010 2000', subject: 'Dispatch training question',
  message: 'I would like to know more about the dispatch masterclass schedule.', preferredMethod: 'Email', service: 'Freight Dispatch Masterclass', consent: true,
  attachment: { name: 'notes.pdf', type: 'application/pdf', size: 12 },
})
check('contact form returns 201 with a reference', contact.status === 201 && /^MSG-/.test(contact.json?.reference), JSON.stringify(contact))
const upload = await anon.storage.from('submission-files').uploadToSignedUrl(contact.json.upload.path, contact.json.upload.token, new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), { contentType: 'application/pdf' })
check('attachment uploads to private storage with the one-time token', !upload.error, upload.error?.message)
const { data: publicFile } = await anon.storage.from('submission-files').download(contact.json.upload.path)
check('anonymous visitors cannot download the attachment', !publicFile)

check('contact form rejects invalid input (400)', (await post('submit-contact', { fullName: 'x', email: 'nope' })).status === 400)
check('contact form rejects honeypot submissions (400)', (await post('submit-contact', { fullName: 'Bot', email: 'bot@example.test', phone: '5550100000', subject: 'Hello', message: 'x'.repeat(30), consent: true, website: 'spam' })).status === 400)
check('contact form rejects disallowed file types (400)', (await post('submit-contact', { fullName: 'Jordan', email: `x${run}@example.test`, phone: '5550100000', subject: 'Hello', message: 'x'.repeat(30), consent: true, attachment: { name: 'a.exe', type: 'application/x-msdownload', size: 10 } })).status === 400)

const bookingDate = nextWeekday(7 + Math.floor(Math.random() * 300))
const bookingBody = { serviceId: 'dispatch', date: bookingDate, time: '9:30 AM', timeZone: 'America/New_York', fullName: 'Jordan Customer', email: customerEmail, phone: '+1 555 010 2000', meetingType: 'Zoom', message: 'Looking for help starting a dispatch service business.' }
const booking = await post('submit-booking', bookingBody)
check('booking returns 201 with a reference', booking.status === 201 && /^BKG-/.test(booking.json?.reference), JSON.stringify(booking))
check('the same slot cannot be booked twice (409)', (await post('submit-booking', { ...bookingBody, email: `other-${run}@example.test` })).status === 409)
check('weekend and invalid slots are rejected (400)', (await post('submit-booking', { ...bookingBody, time: '3:00 AM' })).status === 400)
const { data: booked } = await anon.rpc('consultation_booked_slots', { p_date: bookingDate })
check('public availability shows the slot as taken, without personal data', JSON.stringify(booked) === JSON.stringify(['9:30 AM']), JSON.stringify(booked))
const { data: storedBooking } = await service.from('consultation_bookings').select('price_cents, service_name, email').eq('reference', booking.json.reference).single()
check('booking price is set by the server catalog', storedBooking?.price_cents === 11900 && storedBooking.service_name === 'Dispatch Services Consultation')
check('emails are stored lowercased', storedBooking?.email === customerEmail)

const application = await post('submit-application', { position: 'CDL Class-A Driver', fullName: 'Jordan Customer', email: customerEmail, phone: '+1 555 010 2000', location: 'Atlanta, GA', experience: '3–5 years', coverLetter: 'Safe driver with regional experience.', resume: { name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048 } })
check('job application returns 201 with a reference and upload slot', application.status === 201 && /^APP-/.test(application.json?.reference) && application.json.upload?.token)

section('Row-level security for anonymous visitors')
for (const table of ['contact_submissions', 'consultation_bookings', 'job_applications', 'payments', 'shipments', 'audit_logs', 'customers']) {
  const { data, error } = await anon.from(table).select('*').limit(1)
  check(`anonymous cannot read ${table}`, Boolean(error) || !data?.length, JSON.stringify(data))
}
const { error: anonInsert } = await anon.from('contact_submissions').insert({ full_name: 'Direct', email: 'direct@example.test', subject: 'x', message: 'x' })
check('anonymous cannot insert directly, bypassing the function', Boolean(anonInsert))
const { data: tracked } = await anon.rpc('track_shipment', { p_reference: 'iman-12345' })
check('public tracking finds a shipment case-insensitively', tracked?.reference === 'IMAN-12345')
check('public tracking hides internal fields', tracked && !('internal_notes' in tracked) && !('customer' in tracked) && !('carrier' in tracked))

section('Admin back office')
const { data: adminContacts } = await admin.client.from('contact_submissions').select('*').eq('reference', contact.json.reference)
check('admin sees the contact message', adminContacts?.length === 1)
const contactId = adminContacts?.[0]?.id
const { error: statusError } = await admin.client.from('contact_submissions').update({ status: 'in_progress', admin_notes: 'Called back.' }).eq('id', contactId)
check('admin can update status and internal notes', !statusError, statusError?.message)
const { error: tamperError } = await admin.client.from('contact_submissions').update({ message: 'changed' }).eq('id', contactId)
check('admin cannot edit what the customer submitted', Boolean(tamperError))
const { count: adminDeleted } = await admin.client.from('contact_submissions').delete({ count: 'exact' }).eq('id', contactId)
check('admin cannot delete records (super admin only)', adminDeleted === 0)
const { data: signed, error: signedError } = await admin.client.storage.from('submission-files').createSignedUrl(contact.json.upload.path, 60)
check('admin can open the attachment through a short-lived link', !signedError && (await fetch(signed.signedUrl)).ok, signedError?.message)
const { data: search } = await admin.client.from('contact_submissions').select('reference').or('full_name.ilike.*jordan*,subject.ilike.*jordan*')
check('search finds records by name', search?.some(row => row.reference === contact.json.reference))
const { data: stats, error: statsError } = await admin.client.rpc('admin_dashboard_stats')
check('dashboard statistics load for admins', !statsError && stats.contacts.total >= 1 && stats.bookings.total >= 1 && stats.daily.length === 14, statsError?.message)

const { error: paymentError } = await admin.client.from('payments').insert({ payer_name: 'Jordan Customer', payer_email: customerEmail, description: 'Dispatch consultation', amount_cents: 11900, method: 'zelle', status: 'paid', booking_id: (await service.from('consultation_bookings').select('id').eq('reference', booking.json.reference).single()).data.id })
check('admin can record a payment', !paymentError, paymentError?.message)
const { data: paidBooking } = await admin.client.from('consultation_bookings').select('payment_status').eq('reference', booking.json.reference).single()
check('a paid payment marks the linked booking as paid', paidBooking?.payment_status === 'paid')
const { data: customer } = await admin.client.from('customers').select('*').eq('email', customerEmail).single()
check('customers view combines all activity for one person', customer?.contact_count === 1 && customer.booking_count === 1 && customer.application_count === 1 && customer.payment_count === 1 && Number(customer.total_paid_cents) === 11900, JSON.stringify(customer))

const { error: shipmentError } = await admin.client.from('shipments').insert({ reference: `TEST-${run.toUpperCase()}`, origin: 'Orlando, FL', destination: 'Savannah, GA', internal_notes: 'secret' })
check('admin can create shipments', !shipmentError, shipmentError?.message)
const { data: audit } = await admin.client.from('audit_logs').select('id').limit(1)
check('admin cannot read the audit log', !audit?.length)

section('Employees stay limited to work orders')
const { data: employeeContacts } = await employee.client.from('contact_submissions').select('id')
check('employee cannot read contact messages', !employeeContacts?.length)
const { error: employeeStats } = await employee.client.rpc('admin_dashboard_stats')
check('employee cannot load dashboard statistics', Boolean(employeeStats))

const { data: order, error: orderError } = await superAdmin.client.from('work_orders').insert({ work_order_number: `WO-${run}`, title: 'Test', description: 'Test', assignee_id: employee.id, created_by: superAdmin.id, due_date: bookingDate, notes: [{ id: 'n1', message: 'original' }], status_history: [] }).select('id').single()
check('super admin creates a work order', !orderError, orderError?.message)
const rewrite = await employee.client.rpc('employee_update_work_order', { order_id: order.id, next_status: 'In progress', next_notes: [{ id: 'n1', message: 'rewritten' }], next_history: [], next_resolution_summary: '' })
check('employee cannot rewrite existing work-order notes', Boolean(rewrite.error))
const append = await employee.client.rpc('employee_update_work_order', { order_id: order.id, next_status: 'In progress', next_notes: [{ id: 'n1', message: 'original' }, { id: 'n2', message: 'added' }], next_history: [{ id: 'h1', status: 'In progress' }], next_resolution_summary: '' })
check('employee can append notes and history', !append.error, append.error?.message)

section('Super admin, user management, and audit log')
const { count: deleted } = await superAdmin.client.from('contact_submissions').delete({ count: 'exact' }).eq('id', contactId)
check('super admin can delete records', deleted === 1)
const { data: auditRows } = await superAdmin.client.from('audit_logs').select('action, entity_type, actor_email, changes').eq('entity_id', contactId).order('id')
check('audit log records create, update, and delete for the record', ['insert', 'update', 'delete'].every(action => auditRows?.some(row => row.action === action)), JSON.stringify(auditRows?.map(row => row.action)))
check('audit log names the admin who changed the status', auditRows?.some(row => row.action === 'update' && row.actor_email === admin.email && row.changes.status?.new === 'in_progress'))

check('admins cannot create users (403)', (await post('admin-create-user', { fullName: 'X Y', email: `x-${run}@example.test`, password: 'long-enough-1', role: 'employee' }, { token: admin.token })).status === 403)
const created = await post('admin-create-user', { fullName: 'New Admin', email: `new-admin-${run}@example.test`, password: 'long-enough-1', role: 'admin' }, { token: superAdmin.token })
check('super admin creates an admin account', created.status === 201, JSON.stringify(created))
const { data: newProfile } = await service.from('profiles').select('id, role').eq('email', `new-admin-${run}@example.test`).single()
check('the new account has the admin role', newProfile?.role === 'admin')
check('short passwords are rejected on update (400)', (await post('admin-manage-user', { id: newProfile.id, password: 'short' }, { method: 'PATCH', token: superAdmin.token })).status === 400)
const otherSuper = await makeUser("super_admin", "second-super-admin")
check('another super admin cannot be changed (403)', (await post('admin-manage-user', { id: otherSuper.id, active: false }, { method: 'PATCH', token: superAdmin.token })).status === 403)
check('a role change is saved', (await post('admin-manage-user', { id: newProfile.id, role: 'employee' }, { method: 'PATCH', token: superAdmin.token })).status === 200)
const { data: userAudit } = await superAdmin.client.from('audit_logs').select('action').eq('entity_id', newProfile.id)
check('user management actions are audited', ['user.create', 'user.update'].every(action => userAudit?.some(row => row.action === action)))

const reset = await post('request-password-reset', { email: superAdmin.email })
const resetUnknown = await post('request-password-reset', { email: `nobody-${run}@example.test` })
check('password reset gives the same reply for known and unknown emails', reset.status === 200 && reset.json?.message === resetUnknown.json?.message)

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.')
process.exit(failures ? 1 : 0)

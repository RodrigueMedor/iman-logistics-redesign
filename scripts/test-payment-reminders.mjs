// End-to-end check of SMS payment reminders for the Freight Dispatch
// Masterclass: registration → SUBMITTED/pending → reminders every 24 hours →
// payment → reminders stop; and reminder → STOP reply → reminders stop.
//
// Runs against a LOCAL stack only (it rewrites timestamps to skip ahead 24 hours):
//   npx supabase start              (migrations applied)
//   node scripts/mock-notifications.mjs
//   PAYMENT_REMINDER_CRON_SECRET=local-reminder-secret PAYMENT_REMINDER_SEND_WINDOW=off \
//   TWILIO_WEBHOOK_BASE_URL=http://localhost:3001 RESEND_BASE_URL=http://localhost:4010/resend \
//   TWILIO_API_BASE_URL=http://localhost:4010/twilio npm run dev:api
//   PAYMENT_REMINDER_CRON_SECRET=local-reminder-secret TWILIO_WEBHOOK_BASE_URL=http://localhost:3001 \
//   node --env-file=.env.development.local scripts/test-payment-reminders.mjs
import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const apiUrl = process.env.API_URL || 'http://localhost:3001'
const mockUrl = process.env.MOCK_NOTIFICATIONS_URL || 'http://localhost:4010'
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
if (!url?.includes('127.0.0.1') && !url?.includes('localhost')) throw new Error('Refusing to run: SUPABASE_URL is not a local stack.')
const cronSecret = process.env.PAYMENT_REMINDER_CRON_SECRET
const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || apiUrl
const authToken = process.env.TWILIO_AUTH_TOKEN
if (!cronSecret || !authToken) throw new Error('Set PAYMENT_REMINDER_CRON_SECRET and TWILIO_AUTH_TOKEN (same values as the API).')

const service = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const run = Date.now().toString(36)
const reminderText = 'IMAN Logistics: Your Dispatch Masterclass registration was received, but your payment is still pending. Please complete your payment to secure your registration. Reply STOP to unsubscribe.'
let failures = 0
let passed = 0
const check = (name, condition, detail = '') => {
  if (condition) { passed += 1; console.log(`  ✓ ${name}`) }
  else { failures += 1; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}
const section = title => console.log(`\n${title}`)

async function call(path, { method, body, headers = {}, form } = {}) {
  const response = await fetch(`${apiUrl}/api${path}`, {
    method: method ?? (body || form ? 'POST' : 'GET'),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...headers },
    body: body ? JSON.stringify(body) : form ? new URLSearchParams(form) : undefined,
  })
  const text = await response.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: response.status, json, text }
}
const captured = async () => (await fetch(`${mockUrl}/captured`)).json()
const clearCaptured = () => fetch(`${mockUrl}/captured`, { method: 'DELETE' })
const runReminders = () => call('/internal/payment-reminders/run', { method: 'POST', headers: { Authorization: `Bearer ${cronSecret}` } })
const twilioPost = (path, params, signature) => {
  const data = Object.keys(params).sort().reduce((text, key) => text + key + params[key], `${webhookBase}/api${path}`)
  return call(path, { form: params, headers: { 'X-Twilio-Signature': signature ?? createHmac('sha1', authToken).update(data).digest('base64') } })
}
const remindersTo = async phone => (await captured()).filter(message => message.channel === 'sms' && message.to === phone && message.body === reminderText)
const schedule = async id => (await service.from('payment_reminder_schedules').select('*').eq('registration_id', id).maybeSingle()).data
const reminders = async id => (await service.from('payment_reminders').select('*').eq('registration_id', id).order('attempt_number')).data
const ago = ms => new Date(Date.now() - ms).toISOString()
const HOUR = 3600_000
// Skip ahead: pretend the last reminder went out 24 hours ago and it is due now.
const skipDay = async id => {
  const current = await schedule(id)
  await service.from('payment_reminder_schedules').update({ last_sent_at: ago(24 * HOUR + 60_000), next_reminder_at: ago(1000) }).eq('registration_id', id)
  await service.from('payment_reminders').update({ sent_at: ago(24 * HOUR + 60_000) }).eq('registration_id', id).eq('attempt_number', current.reminder_count)
}
const makeDue = id => service.from('payment_reminder_schedules').update({ next_reminder_at: ago(1000) }).eq('registration_id', id)
const randomPhone = suffix => `+1321${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}${suffix ?? String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

async function main() {
  await clearCaptured()
  const { data: session, error: classError } = await service.from('freight_dispatch_masterclass_classes').insert({
    name: `Reminder test session ${run}`, price_cents: 52000, starts_at: new Date(Date.now() + 20 * 24 * HOUR).toISOString(), ends_at: new Date(Date.now() + 40 * 24 * HOUR).toISOString(),
    status: 'OPEN', allows_online: true, allows_in_person: false, timezone: 'America/New_York',
  }).select('id').single()
  if (classError) throw classError

  section('Student registers (verified, opted in to texts) → SUBMITTED, payment pending')
  const phone = randomPhone()
  const email = `reminder-${run}@example.test`
  const started = await call('/freight-broker/verifications', { body: { email, phone } })
  check('verification codes are sent', started.status === 201, started.text)
  const sent = await captured()
  const smsCode = sent.find(message => message.channel === 'sms' && message.to === phone)?.body.match(/\d{6}/)?.[0]
  const emailCode = sent.find(message => message.channel === 'email' && message.to === email)?.html.match(/>(\d{6})</)?.[1]
  await call(`/freight-broker/verifications/${started.json.id}/verify`, { body: { channel: 'email', code: emailCode } })
  const verified = await call(`/freight-broker/verifications/${started.json.id}/verify`, { body: { channel: 'phone', code: smsCode } })
  check('email and phone are verified', Boolean(verified.json?.verificationToken), verified.text)
  const registrant = { firstName: 'Riley', lastName: 'Student', email, phone, address1: '1 Main St', city: 'Orlando', state: 'FL', zip: '32801', classId: session.id, attendanceType: 'online', verificationId: started.json.id, verificationToken: verified.json.verificationToken, smsConsent: true }
  const created = await call('/freight-broker/registrations', { body: registrant })
  check('registration is created', created.status === 201, created.text)
  const id = created.json.id
  const { data: reg } = await service.from('freight_dispatch_masterclass_registrations').select('*').eq('id', id).single()
  check('it is SUBMITTED with payment pending and consent recorded', reg.status === 'SUBMITTED' && reg.payment_status === 'pending' && Boolean(reg.sms_consent_at) && reg.sms_consent_text.includes('Reply STOP'))
  check('a reminder schedule was created', (await schedule(id))?.status === 'scheduled')
  await clearCaptured()

  section('First reminder only after the first-reminder delay')
  await runReminders()
  check('no reminder right after registering', (await remindersTo(phone)).length === 0)
  const deferred = await schedule(id)
  check('the first reminder is scheduled about an hour after registering', Math.abs(new Date(deferred.next_reminder_at) - (new Date(reg.submitted_at).getTime() + HOUR)) < 5000, deferred.next_reminder_at)

  section('First reminder')
  await service.from('freight_dispatch_masterclass_registrations').update({ submitted_at: ago(2 * HOUR) }).eq('id', id)
  await makeDue(id)
  // Two runs at once (e.g. two processes) must not text twice.
  await Promise.all([runReminders(), runReminders()])
  let texts = await remindersTo(phone)
  check('exactly one reminder is sent', texts.length === 1, String(texts.length))
  check('the reminder asks Twilio for delivery-status callbacks', texts[0]?.statusCallback === undefined || texts[0]?.statusCallback.endsWith('/api/twilio/status'))
  let rows = await reminders(id)
  check('the reminder is tracked (attempt 1, Twilio SID, sent time)', rows.length === 1 && rows[0].attempt_number === 1 && rows[0].status === 'accepted' && rows[0].twilio_message_sid === texts[0].sid && Boolean(rows[0].sent_at) && rows[0].phone === phone, JSON.stringify(rows))
  let state = await schedule(id)
  check('the next reminder is 24 hours later', state.reminder_count === 1 && Math.abs(new Date(state.next_reminder_at) - new Date(state.last_sent_at) - 24 * HOUR) < 1000, JSON.stringify(state))

  section('Delivery-status callbacks')
  check('unsigned callbacks are rejected (403)', (await twilioPost('/twilio/status', { MessageSid: texts[0].sid, MessageStatus: 'delivered' }, 'bad-signature')).status === 403)
  check('a signed callback is accepted', (await twilioPost('/twilio/status', { MessageSid: texts[0].sid, MessageStatus: 'delivered' })).status === 204)
  await twilioPost('/twilio/status', { MessageSid: texts[0].sid, MessageStatus: 'sent' })
  rows = await reminders(id)
  check('delivery status is recorded and never moves backwards', rows[0].delivery_status === 'delivered', rows[0].delivery_status)
  check('the schedule shows the latest delivery', (await schedule(id)).last_delivery_status === 'delivered')

  section('No second reminder within 24 hours')
  await makeDue(id)
  await runReminders()
  check('forcing it due early sends nothing', (await remindersTo(phone)).length === 1)
  state = await schedule(id)
  check('it is pushed back to 24 hours after the last one', Math.abs(new Date(state.next_reminder_at) - new Date(state.last_sent_at) - 24 * HOUR) < 1000)

  section('24 hours later, still pending → next reminder')
  await skipDay(id)
  await runReminders()
  texts = await remindersTo(phone)
  rows = await reminders(id)
  check('a second reminder is sent', texts.length === 2 && rows.length === 2 && rows[1].attempt_number === 2 && rows[1].status === 'accepted', `${texts.length} ${JSON.stringify(rows.map(row => row.status))}`)

  section('Checkout in progress pauses, a failed checkout resumes')
  const { data: payment } = await service.from('payments').insert({ broker_registration_id: id, payer_name: 'Riley Student', payer_email: email, description: 'test', amount_cents: 52000, currency: 'USD', method: 'card', status: 'processing', provider: 'stripe', metadata: { expected_amount: 52000 } }).select('id').single()
  check('processing payment pauses reminders', (await schedule(id)).status === 'paused')
  await service.from('payments').update({ status: 'failed' }).eq('id', payment.id)
  check('failed payment resumes reminders', (await schedule(id)).status === 'scheduled')

  section('Student pays → payment PAID → all reminders stop')
  await service.from('payments').update({ status: 'pending', stripe_checkout_session_id: `cs_test_${run}` }).eq('id', payment.id)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_x')
  const event = JSON.stringify({ id: `evt_${run}`, object: 'event', type: 'checkout.session.completed', data: { object: { id: `cs_test_${run}`, object: 'checkout.session', payment_status: 'paid', status: 'complete', amount_total: 52000, currency: 'usd', payment_intent: `pi_${run}`, metadata: { payment_id: payment.id } } } })
  const webhook = await fetch(`${apiUrl}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': stripe.webhooks.generateTestHeaderString({ payload: event, secret: process.env.STRIPE_WEBHOOK_SECRET }) }, body: event })
  check('the Stripe webhook marks the payment paid', webhook.status === 200, String(webhook.status))
  const { data: paidReg } = await service.from('freight_dispatch_masterclass_registrations').select('status, payment_status').eq('id', id).single()
  check('registration is CONFIRMED and paid', paidReg.status === 'CONFIRMED' && paidReg.payment_status === 'paid', JSON.stringify(paidReg))
  state = await schedule(id)
  check('the schedule stopped immediately (no next reminder)', state.status === 'stopped_paid' && state.next_reminder_at === null, JSON.stringify(state))
  await service.from('payment_reminder_schedules').update({ next_reminder_at: ago(1000), status: 'scheduled' }).eq('registration_id', id)
  check('the database refuses to reschedule a paid registration', (await schedule(id)).next_reminder_at === null)
  await skipDay(id)
  await runReminders()
  check('no reminder after payment', (await remindersTo(phone)).length === 2)

  section('Reminder → student replies STOP → reminders stop')
  const stopPhone = randomPhone()
  const insertRegistration = async (phoneNumber, consent = true) => (await service.from('freight_dispatch_masterclass_registrations').insert({
    registration_no: `FBM-TEST-${run}-${phoneNumber.slice(-4)}`, first_name: 'Sam', last_name: 'Student', email: `stop-${run}-${phoneNumber.slice(-4)}@example.test`, phone: phoneNumber,
    address_line1: '1 Main St', city: 'Orlando', state: 'FL', zip_code: '32801', class_id: session.id, attendance_type: 'online', status: 'SUBMITTED', payment_status: 'pending',
    submitted_at: ago(2 * HOUR), ...(consent ? { sms_consent_at: ago(2 * HOUR), sms_consent_text: 'test' } : {}),
  }).select('id').single()).data.id
  const stopId = await insertRegistration(stopPhone)
  await makeDue(stopId)
  await runReminders()
  check('the student receives a reminder', (await remindersTo(stopPhone)).length === 1)
  const reply = await twilioPost('/twilio/inbound', { From: stopPhone, To: '+15005550006', Body: 'STOP', MessageSid: `SM${run}`, OptOutType: 'STOP' })
  check('the STOP reply is accepted with empty TwiML', reply.status === 200 && reply.text.includes('<Response></Response>'), reply.text)
  const { data: optOut } = await service.from('sms_opt_outs').select('*').eq('phone', stopPhone).single()
  check('the opt-out is recorded for the number', optOut?.opted_out === true && optOut.source === 'twilio_inbound')
  state = await schedule(stopId)
  check('the schedule stopped (opted out)', state.status === 'stopped_opted_out' && state.next_reminder_at === null, JSON.stringify(state))
  await skipDay(stopId)
  await service.from('payment_reminder_schedules').update({ status: 'scheduled' }).eq('registration_id', stopId)
  await runReminders()
  check('no reminder after STOP, even when forced due', (await remindersTo(stopPhone)).length === 1)
  await twilioPost('/twilio/inbound', { From: stopPhone, To: '+15005550006', Body: 'START', MessageSid: `SM${run}b`, OptOutType: 'START' })
  check('START opts the number back in', (await service.from('sms_opt_outs').select('opted_out').eq('phone', stopPhone).single()).data.opted_out === false && (await schedule(stopId)).status === 'scheduled')

  section('Twilio reports the number unsubscribed (21610) → stop')
  const blockedPhone = randomPhone('0161')
  const blockedId = await insertRegistration(blockedPhone)
  await makeDue(blockedId)
  await runReminders()
  const blockedRows = await reminders(blockedId)
  check('the failure is tracked with the Twilio error', blockedRows[0]?.status === 'failed' && blockedRows[0].error_code === '21610', JSON.stringify(blockedRows))
  check('the number is recorded as opted out and the schedule stops', (await schedule(blockedId)).status === 'stopped_opted_out' && (await service.from('sms_opt_outs').select('opted_out').eq('phone', blockedPhone).single()).data?.opted_out === true)

  section('No consent → no schedule')
  const noConsentId = await insertRegistration(randomPhone(), false)
  check('a registration without SMS consent has no reminder schedule', (await schedule(noConsentId)) === null)

  section('Back office')
  check('the reminder run endpoint rejects a wrong token (401)', (await call('/internal/payment-reminders/run', { method: 'POST', headers: { Authorization: 'Bearer nope' } })).status === 401)
  const { data: logged } = await service.from('notification_log').select('status, template').eq('entity_id', id).eq('template', 'freight_broker.payment_reminder_sms')
  check('reminders also appear in the notification log', logged?.length === 2 && logged.every(row => row.status === 'sent'), JSON.stringify(logged))

  console.log(`\n${passed} passed, ${failures} failed`)
  process.exit(failures ? 1 : 0)
}

main().catch(error => { console.error(error); process.exit(1) })

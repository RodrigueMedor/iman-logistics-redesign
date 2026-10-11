import assert from 'node:assert/strict'
import test from 'node:test'
import { fulfillmentJobStatus } from './freightBroker'

test('a sent notification completes its fulfillment job', () => {
  for (const job of ['student_confirmation', 'staff_notification', 'student_sms', 'staff_sms']) assert.equal(fulfillmentJobStatus(job, { status: 'sent' }), 'succeeded')
})

test('an SMS that cannot be sent (no Twilio, no phone) is skipped, not retried', () => {
  assert.equal(fulfillmentJobStatus('student_sms', { status: 'skipped', error: 'Twilio is not configured' }), 'skipped')
  assert.equal(fulfillmentJobStatus('student_sms', { status: 'skipped', error: 'No phone number on file' }), 'skipped')
  assert.equal(fulfillmentJobStatus('staff_sms', { status: 'skipped', error: 'Twilio is not configured' }), 'skipped')
})

test('failed sends and skipped emails stay failed so Stripe retries them', () => {
  assert.equal(fulfillmentJobStatus('student_sms', { status: 'failed', error: 'Twilio 500' }), 'failed')
  assert.equal(fulfillmentJobStatus('student_confirmation', { status: 'failed', error: 'Resend down' }), 'failed')
  assert.equal(fulfillmentJobStatus('student_confirmation', { status: 'skipped', error: 'RESEND_API_KEY is not set' }), 'failed')
  assert.equal(fulfillmentJobStatus('staff_notification', { status: 'skipped', error: 'RESEND_API_KEY is not set' }), 'failed')
})

test('the student email is the same receipt as the "Registration completed!" page', async () => {
  const { studentConfirmationEmailHtml } = await import('./freightBroker')
  const html = studentConfirmationEmailHtml({
    id: 'r1', registration_no: 'FBM-2026-TEST', first_name: 'Rodrigue', last_name: 'Medor <b>x</b>', email: 'student@example.test', phone: '+14075550199',
    address_line1: '100 Main St', address_line2: null, city: 'Orlando', state: 'FL', zip_code: '32801', status: 'CONFIRMED', payment_status: 'paid',
    payment_policy_signature: 'Rodrigue Medor', payment_policy_accepted_at: '2026-10-11T04:16:40Z', payment_policy_version: 'v2', payment_policy_text: 'All payments are non-refundable.',
    attendance_type: 'online', sms_consent_at: null, sms_opted_out_at: null, email_verified_at: null, phone_verified_at: null, class: null,
  }, { id: 'p1', amount_cents: 52000, paid_at: '2026-10-11T04:18:49Z', stripe_payment_intent_id: 'pi_123', stripe_checkout_session_id: 'cs_123' })
  for (const text of ['Registration completed!', 'Thank you, Rodrigue! Your seat in the Freight Dispatch Masterclass is confirmed.', 'FBM-2026-TEST', 'student@example.test', '+14075550199', '100 Main St, Orlando, FL 32801', 'Online / Zoom', '$520.00 USD (Stripe)', 'pi_123', 'Registration policy acknowledged', 'All payments are non-refundable.', 'Electronically signed by Rodrigue Medor']) {
    assert.ok(html.includes(text), `missing: ${text}`)
  }
  assert.ok(html.includes('Medor &lt;b&gt;x&lt;/b&gt;') && !html.includes('<b>x</b>'), 'registrant text must be escaped')
})

test('the payment confirmation text goes only to students who opted in to SMS', async () => {
  const { fulfillmentJobTypes } = await import('./freightBroker')
  const consented = { sms_consent_at: '2026-10-11T04:16:00Z', sms_opted_out_at: null }
  assert.deepEqual(fulfillmentJobTypes(consented, ''), ['student_confirmation', 'student_sms', 'staff_notification'])
  assert.deepEqual(fulfillmentJobTypes({ sms_consent_at: null, sms_opted_out_at: null }, ''), ['student_confirmation', 'staff_notification'])
  assert.deepEqual(fulfillmentJobTypes({ ...consented, sms_opted_out_at: '2026-10-12T00:00:00Z' }, ''), ['student_confirmation', 'staff_notification'])
  assert.deepEqual(fulfillmentJobTypes({ sms_consent_at: null, sms_opted_out_at: null }, '+14075550100'), ['student_confirmation', 'staff_notification', 'staff_sms'])
})

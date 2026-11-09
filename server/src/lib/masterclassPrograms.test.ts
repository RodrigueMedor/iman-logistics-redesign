import assert from 'node:assert/strict'
import test from 'node:test'
import { FREIGHT_BROKER_POLICY_TEXT, MASTERCLASS_PROGRAMS, masterclassProgram } from '../../../src/features/freightBroker/program'
import { freightBrokerClassInput, freightBrokerRegistration } from '../schemas'
import { makeRegistrationNo, registrationDetails, studentConfirmationEmailHtml, type RegistrationRow } from './freightBroker'
import { paymentFollowUpEmailHtml } from './paymentFollowUp'
import { PAYMENT_REMINDER_TEXT, paymentReminderText } from './paymentReminders'

const broker = MASTERCLASS_PROGRAMS.broker_masterclass
const dispatch = MASTERCLASS_PROGRAMS.dispatch_masterclass

const row = (program: string | null): RegistrationRow => ({
  id: 'r1', program, registration_no: 'FBR-2026-TEST', first_name: 'Jordan', last_name: 'Customer', email: 'student@example.test', phone: '+14075550199',
  address_line1: '100 Main St', address_line2: null, city: 'Orlando', state: 'FL', zip_code: '32801', status: 'CONFIRMED', payment_status: 'paid',
  payment_policy_signature: 'Jordan Customer', payment_policy_accepted_at: '2026-11-08T04:16:40Z', payment_policy_version: null, payment_policy_text: null,
  attendance_type: 'online', sms_consent_at: null, sms_opted_out_at: null, email_verified_at: '2026-11-08T04:10:00Z', phone_verified_at: null, class: null,
})

test('rows without a program, or with an unknown one, are Dispatch Masterclass rows', () => {
  assert.equal(masterclassProgram(null).id, 'dispatch_masterclass')
  assert.equal(masterclassProgram(undefined).id, 'dispatch_masterclass')
  assert.equal(masterclassProgram('freight_broker_masterclass').id, 'dispatch_masterclass', 'legacy Stripe metadata id meant Dispatch')
  assert.equal(masterclassProgram('broker_masterclass').id, 'broker_masterclass')
})

test('the Dispatch Masterclass policy wording is unchanged', () => {
  assert.equal(FREIGHT_BROKER_POLICY_TEXT, 'All registration payments are non-refundable. If the student cannot attend the class, the payment remains as a credit on their student account and can be used for a future Freight Dispatch Masterclass session.')
  assert.equal(dispatch.policyVersion, 'v2-freight-dispatch-nonrefundable-credit')
})

test('the Broker Master Class has its own policy, prefix, page, and back office', () => {
  assert.ok(broker.policyText.includes('future Freight Broker Master Class session'))
  assert.notEqual(broker.policyVersion, dispatch.policyVersion)
  assert.match(makeRegistrationNo('broker_masterclass'), /^FBR-\d{4}-[A-Z0-9]+$/)
  assert.match(makeRegistrationNo('dispatch_masterclass'), /^FBM-\d{4}-[A-Z0-9]+$/)
  assert.match(makeRegistrationNo(), /^FBM-/)
  assert.equal(broker.path, '/freight-broker-masterclass/')
  assert.equal(broker.adminPath, '/admin/broker-masterclass/')
})

test('registrations default to the Dispatch Masterclass and reject unknown programs', () => {
  const body = { firstName: 'Jordan', lastName: 'Customer', email: 'jordan@example.test', phone: '+1 407 555 0199', address1: '1 Main', city: 'Orlando', state: 'FL', zip: '32801', classId: 'c1', attendanceType: 'online', smsConsent: false, verificationId: '00000000-0000-4000-8000-000000000000', verificationToken: 'x'.repeat(32) }
  assert.equal(freightBrokerRegistration.parse(body).program, 'dispatch_masterclass')
  assert.equal(freightBrokerRegistration.parse({ ...body, program: 'broker_masterclass' }).program, 'broker_masterclass')
  assert.equal(freightBrokerRegistration.safeParse({ ...body, program: 'other' }).success, false)
})

test('updating a class session without a program never moves it to another program', () => {
  const session = { name: 'Broker cohort', price_cents: 52000, starts_at: '2026-12-01T14:00:00Z', ends_at: '2026-12-05T18:00:00Z' }
  assert.equal(freightBrokerClassInput.parse(session).program, undefined)
  assert.equal(freightBrokerClassInput.parse({ ...session, program: 'broker_masterclass' }).program, 'broker_masterclass')
})

test('Broker Master Class receipts, return page, and follow-ups name the Broker Master Class', () => {
  const payment = { id: 'p1', amount_cents: 52000, paid_at: '2026-11-08T04:18:49Z', stripe_payment_intent_id: 'pi_123', stripe_checkout_session_id: 'cs_123' }
  const html = studentConfirmationEmailHtml(row('broker_masterclass'), payment)
  assert.ok(html.includes('Your seat in the Freight Broker Master Class is confirmed.'))
  assert.ok(html.includes(broker.policyText), 'falls back to the Broker policy text')
  assert.ok(!html.includes('Dispatch'))

  const details = registrationDetails(row('broker_masterclass'))
  assert.equal(details.program, 'broker_masterclass')
  assert.equal(details.className, 'Freight Broker Master Class')
  assert.equal(details.policyText, broker.policyText)
  assert.equal(registrationDetails({ ...row('broker_masterclass'), payment_policy_text: 'Signed wording.' }).policyText, 'Signed wording.')
  assert.equal(registrationDetails(row(null)).program, 'dispatch_masterclass')

  const followUp = paymentFollowUpEmailHtml('Jordan', 'FBR-2026-TEST', '$520.00', 'broker_masterclass')
  assert.ok(followUp.includes('Iman Logistics Freight Broker Master Class') && followUp.includes('https://imanlogistics.com/freight-broker-masterclass/'))
  assert.ok(paymentFollowUpEmailHtml('Jordan', 'FBM-2026-TEST', '$520.00').includes('https://imanlogistics.com/freight-dispatch-masterclass/'))
})

test('SMS payment reminders name the program the student registered for', () => {
  assert.equal(paymentReminderText(null), PAYMENT_REMINDER_TEXT)
  assert.equal(paymentReminderText('dispatch_masterclass'), PAYMENT_REMINDER_TEXT)
  assert.ok(paymentReminderText('broker_masterclass').includes('Broker Master Class registration'))
  assert.ok(paymentReminderText('broker_masterclass').endsWith('Reply STOP to unsubscribe.'))
})

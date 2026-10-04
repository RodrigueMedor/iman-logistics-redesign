import assert from 'node:assert/strict'
import test from 'node:test'
import { earliestSendTime, nextWindowOpening, parseSendWindow, reminderStopReason, retryDelayMinutes, type ReminderRegistration } from './paymentReminders'
import { smsKeyword, twilioSignature, validTwilioSignature } from './twilioWebhooks'

const now = new Date('2026-10-04T15:00:00Z')
const base: ReminderRegistration = {
  id: 'r1', status: 'SUBMITTED', payment_status: 'pending', phone: '+14075550199',
  sms_consent_at: '2026-10-01T00:00:00Z', sms_opted_out_at: null, submitted_at: '2026-10-04T12:00:00Z',
  class: { status: 'OPEN', ends_at: '2026-12-31T00:00:00Z', registration_deadline: null, timezone: 'America/New_York' },
}
const settings = { maxReminders: 7, firstDelayMinutes: 60, intervalHours: 24 }
const stop = (changes: Partial<ReminderRegistration>, count = 0, optedOut = false) => reminderStopReason({ ...base, ...changes }, { reminder_count: count }, optedOut, now, settings)

test('reminds only submitted, unpaid, consenting, reachable registrations', () => {
  assert.equal(stop({}), null)
  assert.equal(stop({ payment_status: 'failed' }), null)
  assert.equal(stop({ payment_status: 'canceled' }), null)
  assert.equal(stop({ payment_status: 'paid', status: 'CONFIRMED' }), 'stopped_paid')
  assert.equal(stop({ payment_status: 'processing' }), 'paused')
  assert.equal(stop({ payment_status: 'refunded' }), 'stopped_status')
  assert.equal(stop({ status: 'CANCELED' }), 'stopped_status')
  assert.equal(stop({ sms_consent_at: null }), 'stopped_no_consent')
  assert.equal(stop({}, 0, true), 'stopped_opted_out')
  assert.equal(stop({ sms_opted_out_at: '2026-10-02T00:00:00Z' }), 'stopped_opted_out')
  assert.equal(stop({ phone: '123' }), 'stopped_invalid_phone')
  assert.equal(stop({ class: { ...base.class!, status: 'CLOSED' } }), 'stopped_class_unavailable')
  assert.equal(stop({ class: { ...base.class!, registration_deadline: '2026-10-01T00:00:00Z' } }), 'stopped_class_unavailable')
  assert.equal(stop({}, 7), 'stopped_max_reached')
  assert.equal(reminderStopReason(base, { reminder_count: 50 }, false, now, { maxReminders: 0 }), null)
})

test('first reminder waits for the delay, later ones for the interval', () => {
  assert.equal(earliestSendTime(base, { last_sent_at: null }, settings).toISOString(), '2026-10-04T13:00:00.000Z')
  assert.equal(earliestSendTime(base, { last_sent_at: '2026-10-05T14:00:00Z' }, settings).toISOString(), '2026-10-06T14:00:00.000Z')
})

test('send window in the class timezone', () => {
  const window = parseSendWindow('9-20')
  assert.deepEqual(window, [9, 20])
  assert.equal(parseSendWindow('off'), null)
  assert.equal(parseSendWindow('0-24'), null)
  // 15:00Z is 11:00 in New York (EDT): open.
  assert.equal(nextWindowOpening(now, 'America/New_York', window), null)
  // 02:30Z is 22:30 the previous evening in New York: opens 09:00 EDT = 13:00Z.
  assert.equal(nextWindowOpening(new Date('2026-10-05T02:30:00Z'), 'America/New_York', window)?.toISOString(), '2026-10-05T13:00:00.000Z')
  // 10:15Z is 06:15 in New York: opens at 13:00Z.
  assert.equal(nextWindowOpening(new Date('2026-10-05T10:15:00Z'), 'America/New_York', window)?.toISOString(), '2026-10-05T13:00:00.000Z')
  // An unknown timezone falls back to New York instead of throwing.
  assert.equal(nextWindowOpening(now, 'Not/AZone', window), null)
})

test('retry backoff', () => {
  assert.deepEqual([1, 2, 3, 9].map(retryDelayMinutes), [5, 15, 45, 45])
})

test('STOP / START keywords, including opt-out requests in a sentence', () => {
  for (const body of ['STOP', 'stop', ' Stop. ', 'UNSUBSCRIBE', 'cancel', 'quit', 'End', 'stopall', 'REVOKE', 'opt out', 'please stop texting me']) assert.equal(smsKeyword(body), 'opt_out', body)
  for (const body of ['START', 'yes', 'unstop']) assert.equal(smsKeyword(body), 'opt_in', body)
  assert.equal(smsKeyword('help'), 'help')
  assert.equal(smsKeyword('when is the class?'), null)
  assert.equal(smsKeyword('anything', 'STOP'), 'opt_out')
})

test('Twilio request signatures', () => {
  // Example from Twilio's webhook security documentation.
  const url = 'https://mycompany.com/myapp.php?foo=1&bar=2'
  const params = { CallSid: 'CA1234567890ABCDE', Caller: '+14158675310', Digits: '1234', From: '+14158675310', To: '+18005551212' }
  assert.equal(twilioSignature('12345', url, params), 'GvWf1cFY/Q7PnoempGyD5oXAezc=')
  assert.equal(validTwilioSignature('12345', url, params, 'GvWf1cFY/Q7PnoempGyD5oXAezc='), true)
  assert.equal(validTwilioSignature('12345', url, { ...params, Digits: '9999' }, 'GvWf1cFY/Q7PnoempGyD5oXAezc='), false)
})

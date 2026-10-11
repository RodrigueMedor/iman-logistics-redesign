import assert from 'node:assert/strict'
import test from 'node:test'
import { followUpDue, paymentFollowUpEmailHtml } from './paymentFollowUp'

const now = new Date('2026-10-12T12:00:00Z')
const base = { status: 'SUBMITTED', payment_status: 'pending', created_at: '2026-10-11T06:00:00Z' }
const clear = { now, delayHours: 24, emailHasPaid: false, emailFollowedUpRecently: false }

test('a registration still unpaid 24 hours after registering gets the follow-up', () => {
  assert.equal(followUpDue(base, clear), true)
})

test('no follow-up before 24 hours, once paid or confirmed, or for an email that already paid or was recently emailed', () => {
  assert.equal(followUpDue({ ...base, created_at: '2026-10-11T13:00:00Z' }, clear), false)
  assert.equal(followUpDue({ ...base, payment_status: 'paid' }, clear), false)
  assert.equal(followUpDue({ ...base, status: 'CONFIRMED' }, clear), false)
  assert.equal(followUpDue({ ...base, status: 'CANCELED' }, clear), false)
  assert.equal(followUpDue(base, { ...clear, emailHasPaid: true }), false)
  assert.equal(followUpDue(base, { ...clear, emailFollowedUpRecently: true }), false)
})

test('the follow-up email uses the approved wording and escapes registrant text', () => {
  const html = paymentFollowUpEmailHtml('Jean <b>', 'FBM-2026-TEST', '$520.00')
  for (const text of ['Hello Jean &lt;b&gt;,', 'registration <strong>FBM-2026-TEST</strong>', 'payment pending', 'Did you see a payment of $520.00 to Iman Logistics', 'please reply to this email to confirm', 'you have not been charged', 'https://imanlogistics.com/freight-dispatch-masterclass/', 'We apologize for the inconvenience.']) {
    assert.ok(html.includes(text), `missing: ${text}`)
  }
  assert.ok(!html.includes('<b>,'))
})

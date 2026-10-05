import assert from 'node:assert/strict'
import test from 'node:test'
import { freightBrokerRegistration } from '../schemas'
import { normalizeVerificationEmail, normalizeVerificationPhone } from './registrationVerification'

test('normalizes registration verification identifiers', () => {
  assert.equal(normalizeVerificationEmail(' Student@Example.COM '), 'student@example.com')
  assert.equal(normalizeVerificationPhone('+1 (407) 555-0199'), '+14075550199')
  assert.equal(normalizeVerificationPhone('(407) 555-0199'), '+14075550199')
  assert.equal(normalizeVerificationPhone('+44 20 7946 0958'), '+442079460958')
  assert.throws(() => normalizeVerificationPhone('123'))
})

test('registration requires attendance and a dual-verification grant', () => {
  const base = {
    firstName: 'Jordan', lastName: 'Student', email: 'jordan@example.com', phone: '+14075550199',
    address1: '100 Main St', address2: '', city: 'Orlando', state: 'FL', zip: '32801',
    classId: '9cdfa539-01a0-48ea-a046-0baace555f2c', website: '',
  }
  assert.equal(freightBrokerRegistration.safeParse(base).success, false)
  const verified = { ...base, attendanceType: 'online', verificationId: '64af632d-88ea-47b0-84bd-d972e04b21f9', verificationToken: 'a'.repeat(32) }
  assert.equal(freightBrokerRegistration.safeParse(verified).success, false)
  assert.equal(freightBrokerRegistration.safeParse({ ...verified, smsConsent: true }).success, true)
  assert.equal(freightBrokerRegistration.safeParse({ ...verified, smsConsent: false }).success, true)
  assert.equal(freightBrokerRegistration.safeParse({ ...base, attendanceType: 'mail', verificationId: '64af632d-88ea-47b0-84bd-d972e04b21f9', verificationToken: 'a'.repeat(32) }).success, false)
})

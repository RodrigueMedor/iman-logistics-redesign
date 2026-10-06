import assert from 'node:assert/strict'
import test from 'node:test'
import { isSuperAdminEmail, superAdminEmail } from './auth'

test('only info@imanlogistics.com is accepted as the super admin email', () => {
  assert.equal(superAdminEmail, 'info@imanlogistics.com')
  assert.equal(isSuperAdminEmail('info@imanlogistics.com'), true)
  assert.equal(isSuperAdminEmail(' INFO@ImanLogistics.com '), true)
  assert.equal(isSuperAdminEmail('rodriguemedor@yahoo.fr'), false)
  assert.equal(isSuperAdminEmail('info@imanlogistics.com.evil.test'), false)
  assert.equal(isSuperAdminEmail(''), false)
  assert.equal(isSuperAdminEmail(undefined), false)
})

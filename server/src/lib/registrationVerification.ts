import { createHmac, randomBytes, randomInt } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config'
import { HttpError } from './http'
import { sendEmail, sendSms } from './notifications'

const CODE_TTL_MS = 10 * 60 * 1000
const TOKEN_TTL_MS = 30 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_SENDS = 3
const MAX_ATTEMPTS = 5

export const normalizeVerificationEmail = (value: string) => value.trim().toLowerCase()
export function normalizeVerificationPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) throw new HttpError(400, 'Enter a valid phone number including country code.')
  return `+${digits}`
}

function secret() {
  if (!config.verificationCodeSecret || config.verificationCodeSecret.length < 32) throw new HttpError(503, 'Contact verification is temporarily unavailable.')
  return config.verificationCodeSecret
}
const digest = (purpose: string, value: string) => createHmac('sha256', secret()).update(`${purpose}:${value}`).digest('hex')
const code = () => randomInt(0, 1_000_000).toString().padStart(6, '0')
const expires = (ttl: number) => new Date(Date.now() + ttl).toISOString()

async function enforceIdentifierLimits(db: SupabaseClient, email: string, phone: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [byEmail, byPhone] = await Promise.all([
    db.from('registration_verifications').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since),
    db.from('registration_verifications').select('id', { count: 'exact', head: true }).eq('phone', phone).gte('created_at', since),
  ])
  if ((byEmail.count ?? 0) >= 3 || (byPhone.count ?? 0) >= 3) throw new HttpError(429, 'Too many verification requests. Please try again later.')
}

export async function startRegistrationVerification(db: SupabaseClient, emailValue: string, phoneValue: string, ip: string) {
  const email = normalizeVerificationEmail(emailValue)
  const phone = normalizeVerificationPhone(phoneValue)
  await enforceIdentifierLimits(db, email, phone)
  const emailCode = code()
  const phoneCode = code()
  const { data, error } = await db.from('registration_verifications').insert({
    email, phone,
    email_code_hash: digest('email-code', emailCode),
    phone_code_hash: digest('phone-code', phoneCode),
    email_expires_at: expires(CODE_TTL_MS),
    phone_expires_at: expires(CODE_TTL_MS),
    request_ip_hash: digest('ip', ip || 'unknown'),
  }).select('id').single()
  if (error) throw error
  const entity = { entityType: 'registration_verifications', entityId: data.id }
  const [emailDelivery, smsDelivery] = await Promise.all([
    sendEmail({ ...entity, template: 'registration.email_verification', to: email, from: config.freightBrokerEmailFrom, subject: 'Your Iman Logistics verification code', html: `<div style="font-family:Arial,sans-serif"><h2>Verify your email</h2><p>Your Iman Logistics registration code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:6px">${emailCode}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>` }),
    sendSms({ ...entity, template: 'registration.phone_verification', to: phone, body: `Iman Logistics verification code: ${phoneCode}. It expires in 10 minutes.` }),
  ])
  if (emailDelivery.status !== 'sent' || smsDelivery.status !== 'sent') throw new HttpError(503, 'We could not send both verification codes. Please contact Iman Logistics or try again later.')
  return { id: data.id, email, phone, expiresInSeconds: CODE_TTL_MS / 1000 }
}

export async function resendRegistrationCode(db: SupabaseClient, id: string, channel: 'email' | 'phone') {
  const { data: row } = await db.from('registration_verifications').select('*').eq('id', id).maybeSingle()
  if (!row || row.consumed_at) throw new HttpError(404, 'Verification request not found.')
  if (row.locked_until && new Date(row.locked_until) > new Date()) throw new HttpError(429, 'Verification is temporarily locked. Please try again later.')
  if (row[`${channel}_verified_at`]) return { verified: true }
  const sends = Number(row[`${channel}_send_count`] ?? 0)
  if (sends >= MAX_SENDS) throw new HttpError(429, 'The resend limit has been reached. Please start again later.')
  const lastSent = new Date(row[`${channel}_sent_at`]).getTime()
  if (Date.now() - lastSent < RESEND_COOLDOWN_MS) throw new HttpError(429, 'Please wait before requesting another code.')
  const nextCode = code()
  const now = new Date().toISOString()
  const { error } = await db.from('registration_verifications').update({
    [`${channel}_code_hash`]: digest(`${channel}-code`, nextCode),
    [`${channel}_expires_at`]: expires(CODE_TTL_MS),
    [`${channel}_send_count`]: sends + 1,
    [`${channel}_attempt_count`]: 0,
    [`${channel}_sent_at`]: now,
    updated_at: now,
  }).eq('id', id)
  if (error) throw error
  const entity = { entityType: 'registration_verifications', entityId: id }
  const delivery = channel === 'email'
    ? await sendEmail({ ...entity, template: 'registration.email_verification', to: row.email, from: config.freightBrokerEmailFrom, subject: 'Your new Iman Logistics verification code', html: `<div style="font-family:Arial,sans-serif"><h2>Verify your email</h2><p>Your new code is <strong style="font-size:24px;letter-spacing:4px">${nextCode}</strong>.</p><p>It expires in 10 minutes.</p></div>` })
    : await sendSms({ ...entity, template: 'registration.phone_verification', to: row.phone, body: `Iman Logistics verification code: ${nextCode}. It expires in 10 minutes.` })
  if (delivery.status !== 'sent') throw new HttpError(503, 'The verification code could not be sent. Please try again later.')
  return { verified: false, expiresInSeconds: CODE_TTL_MS / 1000 }
}

export async function verifyRegistrationCode(db: SupabaseClient, id: string, channel: 'email' | 'phone', enteredCode: string) {
  const { data: row } = await db.from('registration_verifications').select('*').eq('id', id).maybeSingle()
  if (!row || row.consumed_at) throw new HttpError(404, 'Verification request not found.')
  if (row.locked_until && new Date(row.locked_until) > new Date()) throw new HttpError(429, 'Verification is temporarily locked. Please try again later.')
  if (row[`${channel}_verified_at`]) return verificationReply(db, row)
  const attempts = Number(row[`${channel}_attempt_count`] ?? 0) + 1
  const expired = new Date(row[`${channel}_expires_at`]) <= new Date()
  const matches = !expired && digest(`${channel}-code`, enteredCode) === row[`${channel}_code_hash`]
  const now = new Date().toISOString()
  const changes: Record<string, unknown> = { [`${channel}_attempt_count`]: attempts, updated_at: now }
  if (matches) changes[`${channel}_verified_at`] = now
  else if (attempts >= MAX_ATTEMPTS) changes.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { data: updated, error } = await db.from('registration_verifications').update(changes).eq('id', id).select('*').single()
  if (error) throw error
  if (!matches) throw new HttpError(expired ? 410 : 400, expired ? 'This code has expired. Request a new code.' : 'The verification code is incorrect.')
  return verificationReply(db, updated)
}

async function verificationReply(db: SupabaseClient, row: Record<string, any>) {
  if (!row.email_verified_at || !row.phone_verified_at) return { emailVerified: Boolean(row.email_verified_at), phoneVerified: Boolean(row.phone_verified_at) }
  const token = randomBytes(32).toString('base64url')
  const tokenExpiresAt = expires(TOKEN_TTL_MS)
  const { error } = await db.from('registration_verifications').update({ token_hash: digest('grant', token), token_expires_at: tokenExpiresAt, updated_at: new Date().toISOString() }).eq('id', row.id)
  if (error) throw error
  return { emailVerified: true, phoneVerified: true, verificationToken: token, tokenExpiresAt }
}

export async function consumeRegistrationVerification(db: SupabaseClient, id: string, token: string, emailValue: string, phoneValue: string) {
  const email = normalizeVerificationEmail(emailValue)
  const phone = normalizeVerificationPhone(phoneValue)
  const { data, error } = await db.from('registration_verifications').update({ consumed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id).eq('email', email).eq('phone', phone).eq('token_hash', digest('grant', token)).is('consumed_at', null)
    .gt('token_expires_at', new Date().toISOString()).not('email_verified_at', 'is', null).not('phone_verified_at', 'is', null)
    .select('id, email_verified_at, phone_verified_at').maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(403, 'Verify your email address and phone number before registering.')
  return data
}

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OPTED_OUT_ERROR, UNREACHABLE_PHONE_ERRORS, toE164 } from './paymentReminders'

// Twilio webhooks: message status callbacks and incoming SMS (STOP/START).

// https://www.twilio.com/docs/usage/webhooks/webhooks-security: HMAC-SHA1 of
// the full URL followed by each POST parameter name and value, sorted by name.
export function twilioSignature(authToken: string, url: string, params: Record<string, unknown>) {
  const data = Object.keys(params).sort().reduce((text, key) => text + key + String(params[key] ?? ''), url)
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
}

export function validTwilioSignature(authToken: string, url: string, params: Record<string, unknown>, signature: string) {
  const expected = Buffer.from(twilioSignature(authToken, url, params))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

// Twilio's default opt-out and opt-in keywords, plus the FCC's 2025
// "reasonable means" words (REVOKE, OPT OUT) and opt-out requests in a sentence.
const OPT_OUT_KEYWORDS = new Set(['STOP', 'STOPALL', 'STOP ALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT', 'OPT OUT'])
const OPT_IN_KEYWORDS = new Set(['START', 'YES', 'UNSTOP'])

export function smsKeyword(body: string, optOutType?: string): 'opt_out' | 'opt_in' | 'help' | null {
  // Set by Twilio Advanced Opt-Out when the message matched a keyword.
  const type = (optOutType || '').toUpperCase()
  if (type === 'STOP') return 'opt_out'
  if (type === 'START') return 'opt_in'
  if (type === 'HELP') return 'help'
  const text = body.toUpperCase().replace(/[^A-Z]+/g, ' ').trim()
  if (OPT_OUT_KEYWORDS.has(text)) return 'opt_out'
  if (OPT_IN_KEYWORDS.has(text)) return 'opt_in'
  if (text === 'HELP' || text === 'INFO') return 'help'
  if (/\b(STOP|UNSUBSCRIBE|OPT OUT|OPTOUT|REVOKE)\b/.test(text)) return 'opt_out'
  return null
}

// Twilio handles the STOP/START/HELP confirmation replies itself; this only
// records the choice so the scheduler stops (or resumes) right away.
export async function handleInboundSms(db: SupabaseClient, params: Record<string, string>) {
  const phone = toE164(params.From)
  const keyword = smsKeyword(params.Body || '', params.OptOutType)
  if (!phone || !keyword || keyword === 'help') return keyword
  const { error } = await db.rpc(keyword === 'opt_out' ? 'record_sms_opt_out' : 'record_sms_opt_in', { p_phone: phone, p_source: 'twilio_inbound', p_keyword: (params.Body || '').trim().slice(0, 40) })
  if (error) throw error
  console.log(`[twilio] ${keyword === 'opt_out' ? 'opt-out' : 'opt-in'} recorded`, JSON.stringify({ phone: `***${phone.slice(-4)}` }))
  return keyword
}

// Status callbacks can arrive out of order; never move a message backwards.
const STATUS_RANK: Record<string, number> = { accepted: 0, scheduled: 0, queued: 1, sending: 2, sent: 3, delivered: 4, undelivered: 4, failed: 4, canceled: 4, read: 5 }
const rank = (status: string) => STATUS_RANK[status] ?? 0

export async function recordDeliveryStatus(db: SupabaseClient, params: Record<string, string>) {
  const sid = params.MessageSid || params.SmsSid
  const status = (params.MessageStatus || params.SmsStatus || '').toLowerCase()
  if (!sid || !status) return
  const { data: reminder, error } = await db.from('payment_reminders').select('id, registration_id, phone, delivery_status, attempt_number').eq('twilio_message_sid', sid).maybeSingle()
  if (error) throw error
  // Other texts (verification codes, receipts) are tracked in notification_log only.
  if (!reminder) return
  if (rank(status) < rank(reminder.delivery_status)) return
  const errorCode = params.ErrorCode || ''
  const errorMessage = errorCode ? `Twilio error ${errorCode}: https://www.twilio.com/docs/api/errors/${errorCode}` : ''
  const at = new Date().toISOString()
  const { error: updateError } = await db.from('payment_reminders').update({ delivery_status: status, status_updated_at: at, ...(errorCode ? { error_code: errorCode, error_message: errorMessage } : {}) }).eq('id', reminder.id)
  if (updateError) throw updateError
  // Show the newest reminder's delivery on the registration.
  const { data: newest } = await db.from('payment_reminders').select('id').eq('registration_id', reminder.registration_id).order('attempt_number', { ascending: false }).limit(1).maybeSingle()
  if (newest?.id === reminder.id) await db.from('payment_reminder_schedules').update({ last_delivery_status: status, last_error: errorMessage }).eq('registration_id', reminder.registration_id)
  const code = Number(errorCode)
  if (code === OPTED_OUT_ERROR) {
    const { error: optOutError } = await db.rpc('record_sms_opt_out', { p_phone: reminder.phone, p_source: 'twilio_error_21610', p_keyword: '' })
    if (optOutError) throw optOutError
  } else if (UNREACHABLE_PHONE_ERRORS.has(code)) {
    await db.from('payment_reminder_schedules').update({ status: 'stopped_invalid_phone', next_reminder_at: null }).eq('registration_id', reminder.registration_id).in('status', ['scheduled', 'paused'])
  }
  if (status === 'failed' || status === 'undelivered') console.warn('[twilio] payment reminder not delivered', JSON.stringify({ registrationId: reminder.registration_id, attempt: reminder.attempt_number, status, errorCode }))
}

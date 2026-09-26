import { Resend } from 'resend'
import { config } from '../config'
import { serviceClient } from './supabase'

// Email (Resend) and SMS (Twilio REST API, no SDK), following the Iman
// Trucking School dispatcher notifications. Each channel is a safe no-op until
// configured, and every attempt — sent, skipped, or failed — is recorded in
// notification_log so staff can see what went out.

let resend: Resend | null = null
const resendClient = () => (config.resendApiKey ? (resend ??= new Resend(config.resendApiKey)) : null)

const twilioConfigured = () => Boolean(config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber)

type Entity = { entityType: string; entityId: string }
type LogEntry = Entity & { channel: 'email' | 'sms'; template: string; recipient: string; subject?: string; status: 'sent' | 'skipped' | 'failed'; provider?: string; providerId?: string; error?: string }

async function log(entry: LogEntry) {
  const { error } = await serviceClient().from('notification_log').insert({
    channel: entry.channel, template: entry.template, recipient: entry.recipient, subject: entry.subject ?? '', status: entry.status,
    provider: entry.provider ?? '', provider_id: entry.providerId ?? '', error: entry.error ?? '', entity_type: entry.entityType, entity_id: entry.entityId,
  })
  if (error) console.error('Notification log write failed', error)
}

// Registrant-supplied values come from a public form, so every value placed in
// email HTML is entity-escaped first.
export function escapeHtml(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function sendEmail(message: Entity & { template: string; to: string; subject: string; html: string; from?: string }) {
  const client = resendClient()
  const base = { channel: 'email' as const, template: message.template, recipient: message.to, subject: message.subject, entityType: message.entityType, entityId: message.entityId, provider: 'resend' }
  if (!client) return log({ ...base, status: 'skipped', error: 'RESEND_API_KEY is not set' })
  try {
    const { data, error } = await client.emails.send({ from: message.from ?? config.emailFrom, to: message.to, subject: message.subject, html: message.html })
    if (error) throw new Error(error.message)
    await log({ ...base, status: 'sent', providerId: data?.id })
  } catch (error) {
    console.error(`Failed to send ${message.template} email:`, error)
    await log({ ...base, status: 'failed', error: error instanceof Error ? error.message : String(error) })
  }
}

export async function sendSms(message: Entity & { template: string; to: string | null | undefined; body: string }) {
  const base = { channel: 'sms' as const, template: message.template, recipient: message.to || '', entityType: message.entityType, entityId: message.entityId, provider: 'twilio' }
  if (!message.to) return log({ ...base, status: 'skipped', error: 'No phone number on file' })
  if (!twilioConfigured()) return log({ ...base, status: 'skipped', error: 'Twilio is not configured' })
  try {
    const { accountSid, authToken, fromNumber, apiBaseUrl } = config.twilio
    const response = await fetch(`${apiBaseUrl}/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: message.to, From: fromNumber, Body: message.body }),
    })
    if (!response.ok) throw new Error(`Twilio SMS failed with status ${response.status}`)
    const result = await response.json().catch(() => ({})) as { sid?: string }
    await log({ ...base, status: 'sent', providerId: result.sid })
  } catch (error) {
    console.error(`Failed to send ${message.template} SMS:`, error)
    await log({ ...base, status: 'failed', error: error instanceof Error ? error.message : String(error) })
  }
}

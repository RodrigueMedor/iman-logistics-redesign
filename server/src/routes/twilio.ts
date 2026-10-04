import { timingSafeEqual } from 'node:crypto'
import express, { Router, type Request } from 'express'
import { config } from '../config'
import { HttpError } from '../lib/http'
import { runPaymentReminders } from '../lib/paymentReminders'
import { serviceClient } from '../lib/supabase'
import { handleInboundSms, recordDeliveryStatus, validTwilioSignature } from '../lib/twilioWebhooks'

// Twilio Console → Phone Numbers (or the Messaging Service) → "A message
// comes in": POST https://<site>/api/twilio/inbound. Status callbacks are
// requested per message and go to /api/twilio/status. Both are verified with
// the X-Twilio-Signature header against TWILIO_WEBHOOK_BASE_URL (or APP_URL).
export const twilioRoutes = Router()

const form = express.urlencoded({ extended: false, limit: '64kb' })

function verifyTwilio(req: Request) {
  if (!config.twilio.authToken) throw new HttpError(503, 'Twilio is not configured on the server.')
  const url = `${config.twilio.webhookBaseUrl}${req.originalUrl}`
  if (!validTwilioSignature(config.twilio.authToken, url, req.body ?? {}, req.header('x-twilio-signature') || '')) {
    console.warn('[twilio] rejected webhook with an invalid signature', JSON.stringify({ url }))
    throw new HttpError(403, 'Invalid Twilio signature.')
  }
}

twilioRoutes.post('/twilio/status', form, async (req, res) => {
  verifyTwilio(req)
  await recordDeliveryStatus(serviceClient(), req.body)
  res.status(204).end()
})

twilioRoutes.post('/twilio/inbound', form, async (req, res) => {
  verifyTwilio(req)
  await handleInboundSms(serviceClient(), req.body)
  // Empty TwiML: Twilio sends the standard STOP/START/HELP replies itself.
  res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
})

// Optional backup trigger for an external cron (e.g. Hostinger cron every
// 15 minutes). The in-process scheduler already runs without it.
twilioRoutes.post('/internal/payment-reminders/run', async (req, res) => {
  const secret = config.paymentReminders.cronSecret
  if (!secret) throw new HttpError(404, 'Not found.')
  const given = Buffer.from(req.headers.authorization?.replace(/^Bearer\s+/i, '') || '')
  const expected = Buffer.from(secret)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new HttpError(401, 'Invalid token.')
  res.json(await runPaymentReminders())
})

import express, { Router } from 'express'
import type Stripe from 'stripe'
import { config } from '../config'
import { serviceClient } from '../lib/supabase'
import { handleStripeEvent, stripeClient } from '../lib/stripe'

// Stripe Dashboard → Developers → Webhooks: send checkout.session.*,
// payment_intent.succeeded, payment_intent.payment_failed, and charge.refunded
// to https://<api-host>/api/stripe/webhook and put the signing secret in
// STRIPE_WEBHOOK_SECRET. Registered at both path styles, like the school site.
export const stripeWebhookRoutes = Router()

async function handle(req: express.Request, res: express.Response) {
  if (!config.stripeWebhookSecret || !config.stripeSecretKey) return void res.status(500).json({ error: 'Stripe webhooks are not configured on the server.' })
  const stripe = stripeClient()
  let event: Stripe.Event
  try {
    // Signature verification needs the exact raw body.
    event = stripe.webhooks.constructEvent(req.body as Buffer, req.headers['stripe-signature'] || '', config.stripeWebhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error instanceof Error ? error.message : error)
    return void res.status(400).json({ error: 'Invalid signature' })
  }
  const db = serviceClient()
  const { data: existing } = await db.from('stripe_webhook_events').select('attempts').eq('event_id', event.id).maybeSingle()
  if (existing) await db.from('stripe_webhook_events').update({ attempts: Number(existing.attempts) + 1, status: 'processing', error: '', updated_at: new Date().toISOString() }).eq('event_id', event.id)
  else {
    const { error } = await db.from('stripe_webhook_events').insert({ event_id: event.id, event_type: event.type })
    if (error && error.code !== '23505') throw error
  }
  try {
    await handleStripeEvent(db, stripe, event)
    await db.from('stripe_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('event_id', event.id)
    res.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    await db.from('stripe_webhook_events').update({ status: 'failed', error: error instanceof Error ? error.message : String(error), updated_at: new Date().toISOString() }).eq('event_id', event.id)
    // A non-2xx reply makes Stripe retry the event later.
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

stripeWebhookRoutes.post(['/stripe/webhook', '/stripe-webhook'], express.raw({ type: 'application/json', limit: '1mb' }), handle)

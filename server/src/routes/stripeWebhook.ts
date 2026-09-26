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
  try {
    await handleStripeEvent(serviceClient(), stripe, event)
    res.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    // A non-2xx reply makes Stripe retry the event later.
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

stripeWebhookRoutes.post(['/stripe/webhook', '/stripe-webhook'], express.raw({ type: 'application/json', limit: '1mb' }), handle)

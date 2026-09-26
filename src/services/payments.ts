import { useEffect, useState } from 'react'
import { api } from './api'

// Online payment is offered when the API has Stripe configured. Checkout runs
// on Stripe's hosted page, so the browser never handles card details.
let onlinePayments: Promise<boolean> | null = null
export function useOnlinePayments() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    onlinePayments ??= api<{ onlinePayments: boolean }>('/public-config').then(config => config.onlinePayments).catch(() => false)
    let current = true
    void onlinePayments.then(value => { if (current) setEnabled(value) })
    return () => { current = false }
  }, [])
  return enabled
}

export type PendingCheckout = { reference: string; email: string; signature: string }
const pendingKey = 'iman-pending-checkout'

export function rememberPendingCheckout(value: PendingCheckout) {
  try { window.sessionStorage.setItem(pendingKey, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export function pendingCheckout(): PendingCheckout | null {
  try { return JSON.parse(window.sessionStorage.getItem(pendingKey) || 'null') } catch { return null }
}

export function clearPendingCheckout() {
  try { window.sessionStorage.removeItem(pendingKey) } catch { /* storage unavailable */ }
}

export async function startBookingCheckout(checkout: PendingCheckout) {
  const { url } = await api<{ sessionId: string; url: string | null }>(`/bookings/${encodeURIComponent(checkout.reference)}/checkout`, {
    body: { email: checkout.email, paymentPolicyAccepted: true, paymentPolicySignature: checkout.signature },
  })
  if (!url) throw new Error('Checkout session was not returned. Please try again.')
  rememberPendingCheckout(checkout)
  window.location.assign(url)
}

export type PaymentStatusResponse = {
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded'
  amount_cents: number
  currency: string
  booking: {
    reference: string
    serviceName: string
    duration: number
    date: string
    time: string
    timeZone: string
    meetingType: string
    fullName: string
    email: string
    status: string
    paymentStatus: string
  } | null
}

export async function getPaymentStatus(sessionId: string): Promise<PaymentStatusResponse> {
  return api<PaymentStatusResponse>(`/payments/status?session_id=${encodeURIComponent(sessionId)}`)
}

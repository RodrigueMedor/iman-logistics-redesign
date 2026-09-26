import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { clearPendingCheckout, getPaymentStatus, pendingCheckout, startBookingCheckout, type PaymentStatusResponse } from '../../services/payments'
import { Confirmation } from './Confirmation'

const settled = ['succeeded', 'failed', 'canceled', 'refunded']

// Shown when Stripe sends the customer back (?payment=success|canceled&session_id=…).
export function PaymentResult({ sessionId, returnState, onRestart }: { sessionId: string; returnState: string; onRestart: () => void }) {
  const [result, setResult] = useState<PaymentStatusResponse | null>(null)
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer = 0
    const poll = async () => {
      attempts += 1
      try {
        const next = await getPaymentStatus(sessionId)
        if (cancelled) return
        setResult(next)
        // A canceled return keeps the session open on Stripe's side; stop polling.
        if (settled.includes(next.status) || returnState === 'canceled' || attempts >= 10) return setWaiting(false)
        timer = window.setTimeout(() => void poll(), 2000)
      } catch (caught) {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'Payment status is unavailable.')
        setWaiting(false)
      }
    }
    void poll()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [sessionId, returnState])

  useEffect(() => { if (result?.status === 'succeeded') clearPendingCheckout() }, [result?.status])

  const retry = async () => {
    const pending = pendingCheckout()
    if (!pending || pending.reference !== result?.booking?.reference) return onRestart()
    setPaying(true)
    setError('')
    try {
      await startBookingCheckout(pending)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Checkout could not be opened.')
      setPaying(false)
    }
  }

  if (waiting && !result) return <Stack alignItems="center" spacing={2} py={6}><CircularProgress /><Typography color="text.secondary">Checking your payment…</Typography></Stack>
  if (!result?.booking) return <Box maxWidth={700} mx="auto"><Alert severity="error">{error || 'We could not find this payment. If you were charged, contact Iman Logistics with your booking reference.'}</Alert><Button onClick={onRestart} sx={{ mt: 2 }}>Book a consultation</Button></Box>

  const { booking } = result
  const details = { ...booking, date: dayjs(booking.date) }
  const canRetry = pendingCheckout()?.reference === booking.reference && ['pending', 'confirmed'].includes(booking.status)

  if (result.status === 'succeeded') return <Confirmation booking={details} payment="paid" onRestart={onRestart} />
  if (result.status === 'refunded') return <Box maxWidth={700} mx="auto"><Alert severity="info">This payment was refunded. Contact Iman Logistics with booking {booking.reference} if you have questions.</Alert><Button onClick={onRestart} sx={{ mt: 2 }}>Book a consultation</Button></Box>
  if (waiting || ['pending', 'processing'].includes(result.status) && returnState !== 'canceled') {
    return <Box maxWidth={700} mx="auto" textAlign="center">
      {waiting && <CircularProgress sx={{ mb: 2 }} />}
      <Alert severity="info" sx={{ textAlign: 'left' }}>{waiting ? 'Confirming your payment with Stripe…' : `Your payment for booking ${booking.reference} is still processing. We will email ${booking.email} once it is confirmed.`}</Alert>
    </Box>
  }
  return <Confirmation
    booking={details}
    payment="due"
    paying={paying}
    paymentError={error || (result.status === 'failed' ? 'The payment did not go through. You can try again with another card.' : 'Payment was canceled before it was completed.')}
    onPay={canRetry ? () => void retry() : undefined}
    onRestart={onRestart}
  />
}

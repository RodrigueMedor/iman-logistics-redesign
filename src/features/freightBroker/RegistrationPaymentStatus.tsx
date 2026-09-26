import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { getBrokerPaymentStatus, type RegistrationPaymentStatus as StatusResponse } from './api'

type Status = StatusResponse['status']
const settled: Status[] = ['succeeded', 'failed', 'canceled', 'refunded']

// Adapted from the school's PaymentStatus component: polls the payment status
// after Stripe sends the registrant back.
export function RegistrationPaymentStatus({ sessionId, returnState, onContinue, onRetry, onDismiss }: {
  sessionId: string
  returnState: string
  onContinue: (result: StatusResponse) => void
  onRetry: () => void
  onDismiss: () => void
}) {
  const [status, setStatus] = useState<Status | null>(null)
  const [result, setResult] = useState<StatusResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer = 0
    const poll = async () => {
      attempts += 1
      try {
        const next = await getBrokerPaymentStatus(sessionId)
        if (cancelled) return
        setResult(next)
        setStatus(next.status)
        // Canceling on Stripe leaves the payment pending until the session expires.
        if (returnState === 'canceled' && !settled.includes(next.status)) return setStatus('canceled')
        if (!settled.includes(next.status) && attempts < 12) timer = window.setTimeout(() => void poll(), 2000)
      } catch {
        if (cancelled) return
        if (attempts < 6) timer = window.setTimeout(() => void poll(), 2000)
        else setStatus(returnState === 'success' ? 'processing' : null)
      }
    }
    void poll()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [sessionId, returnState])

  const isProcessing = status === null || status === 'pending' || status === 'processing'
  const dollars = result?.amount_cents != null ? `$${(result.amount_cents / 100).toFixed(2)}` : null
  let icon: ReactNode = null
  let title = 'Processing your payment'
  let message = 'We are confirming your payment with the bank. This usually takes a few seconds.'
  let tone: 'success' | 'error' | 'warning' | 'info' = 'info'
  if (!isProcessing) {
    switch (status) {
      case 'succeeded':
        icon = <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50', mb: 3 }} />
        title = 'Payment successful'
        message = dollars ? `Your ${dollars} payment was received. Your registration is complete.` : 'Your payment was received. Your registration is complete.'
        tone = 'success'
        break
      case 'refunded':
        icon = <CheckCircleIcon sx={{ fontSize: 64, color: '#8a5700', mb: 3 }} />
        title = 'Payment refunded'
        message = dollars ? `Your ${dollars} payment has been refunded.` : 'Your payment has been refunded.'
        tone = 'warning'
        break
      case 'failed':
        icon = <ErrorIcon sx={{ fontSize: 64, color: '#d61f2c', mb: 3 }} />
        title = 'Payment failed'
        message = 'Your payment could not be processed. Please try again or contact us for help.'
        tone = 'error'
        break
      default:
        icon = <CancelIcon sx={{ fontSize: 64, color: '#8a8f9c', mb: 3 }} />
        title = 'Payment canceled'
        message = 'You canceled the payment session. Your registration details have been saved, and you can try paying again whenever you are ready.'
        tone = 'warning'
    }
  }

  return (
    <Card sx={{ maxWidth: 820, mx: 'auto', boxShadow: '0 25px 50px rgba(10,0,90,.15)', borderRadius: 4 }}>
      <CardContent sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
        {isProcessing ? <>
          <CircularProgress size={64} sx={{ mb: 3 }} />
          <Typography variant="h3" fontWeight={900} gutterBottom>{title}</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>{message}</Typography>
          <Alert severity="info" sx={{ textAlign: 'left' }}>You can close this page; your registration is confirmed automatically once the payment clears, and you will receive a confirmation email.</Alert>
        </> : <>
          {icon}
          <Typography variant="h3" fontWeight={900} gutterBottom>{title}</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>{message}</Typography>
          <Alert severity={tone} sx={{ textAlign: 'left' }}>
            {status === 'succeeded' ? 'A confirmation is on file and our team can see your paid registration.'
              : status === 'refunded' ? 'If you believe this is an error, contact Iman Logistics.'
                : status === 'canceled' ? 'No charge was made. Your registration is preserved so you can complete payment.'
                  : 'Need help? Contact Iman Logistics at info@imanlogistics.com.'}
          </Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={2} sx={{ mt: 4 }}>
            {status === 'succeeded' && result
              ? <Button variant="contained" color="secondary" size="large" onClick={() => onContinue(result)}>View Completed Registration</Button>
              : <>
                <Button variant="contained" size="large" onClick={onRetry}>{status === 'canceled' ? 'Try payment again' : 'Retry payment'}</Button>
                <Box component="span"><Button variant="outlined" size="large" onClick={onDismiss}>Review registration details</Button></Box>
              </>}
          </Stack>
        </>}
      </CardContent>
    </Card>
  )
}

import { useState } from 'react'
import { Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import type { Dayjs } from 'dayjs'
import type { ConsultationService } from './consultationData'
import type { BookingFormValues } from './BookingForm'
import { bookingPaymentPolicyText } from './serviceCatalog'
import { useOnlinePayments } from '../../services/payments'

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

export function BookingSummary({
  service,
  date,
  time,
  timeZone,
  details,
  submitting,
  onEdit,
  onConfirm,
}: {
  service: ConsultationService
  date: Dayjs
  time: string
  timeZone: string
  details: BookingFormValues
  submitting: boolean
  onEdit: () => void
  onConfirm: (signature: string) => void
}) {
  const isStripeEnabled = useOnlinePayments()
  const [accepted, setAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const signed = accepted && normalizeName(signature) === normalizeName(details.fullName)
  return (
    <Box maxWidth={800} mx="auto">
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box><Typography variant="overline" color="secondary" fontWeight={800}>Booking summary</Typography><Typography variant="h4" color="primary" fontWeight={800}>{service.name}</Typography></Box>
          <Chip icon={<CalendarMonthOutlinedIcon />} label={`${service.duration} min`} />
        </Stack>
        <Divider sx={{ my: 3 }} />
        <SummaryLine label="Date" value={date.format('dddd, MMMM D, YYYY')} />
        <SummaryLine label="Time" value={time} />
        <SummaryLine label="Time zone" value={timeZone} />
        <SummaryLine label="Meeting" value={details.meetingType} />
        <SummaryLine label="Guest" value={`${details.fullName} · ${details.email}`} />
        <Divider sx={{ my: 3 }} />
        <SummaryLine label="Consultation" value={`$${service.price.toFixed(2)}`} />
        <SummaryLine label="Taxes" value="$0.00" />
        <Stack direction="row" justifyContent="space-between" mt={1}><Typography variant="h6" fontWeight={800}>Total</Typography><Typography variant="h5" color="primary" fontWeight={900}>${service.price.toFixed(2)}</Typography></Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: 'divider', mt: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={1}>Payment options</Typography>
        <Typography color="text.secondary" mb={2}>{isStripeEnabled ? 'After you confirm, you will be taken to Stripe’s secure checkout to pay by card. Your time is confirmed once payment is complete.' : 'Our team will contact you to arrange payment after you book.'}</Typography>
        {isStripeEnabled && <Stack direction="row" flexWrap="wrap" gap={1}>{['Credit Card', 'Debit Card', 'Stripe Checkout'].map(label => <Chip key={label} icon={<PaymentOutlinedIcon />} label={label} variant="outlined" />)}</Stack>}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mt={3}>
          <Chip icon={<LockOutlinedIcon />} label="Secure Checkout" color="success" variant="outlined" />
          <Chip icon={<VerifiedUserOutlinedIcon />} label="SSL Protected" color="success" variant="outlined" />
          <Chip icon={<LockOutlinedIcon />} label="Encrypted Payment" color="success" variant="outlined" />
        </Stack>
      </Paper>
      {isStripeEnabled && <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: 'divider', mt: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={1}>Payment policy</Typography>
        <Typography color="text.secondary">{bookingPaymentPolicyText}</Typography>
        <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={accepted} onChange={event => setAccepted(event.target.checked)} />} label="I have read and accept the payment policy." />
        <TextField fullWidth size="small" label="Type your full name to sign" value={signature} onChange={event => setSignature(event.target.value)} helperText={signature && !signed && accepted ? `Type your name exactly as entered: ${details.fullName}` : ' '} error={Boolean(signature) && accepted && !signed} sx={{ mt: 1 }} />
      </Paper>}
      <Alert severity="info" sx={{ mt: 3 }}>By confirming, you agree to receive appointment updates at the email address provided.</Alert>
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="space-between" gap={2} mt={3}>
        <Button onClick={onEdit} disabled={submitting}>Edit booking</Button>
        <Button variant="contained" size="large" onClick={() => onConfirm(signature.trim())} disabled={submitting || (isStripeEnabled && !signed)} startIcon={isStripeEnabled ? <LockOutlinedIcon /> : undefined}>{submitting ? (isStripeEnabled ? 'Opening secure checkout…' : 'Confirming…') : isStripeEnabled ? `Confirm and pay $${service.price.toFixed(2)}` : 'Confirm booking'}</Button>
      </Stack>
    </Box>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5} py={0.75}><Typography color="text.secondary">{label}</Typography><Typography fontWeight={700} textAlign={{ sm: 'right' }}>{value}</Typography></Stack>
}

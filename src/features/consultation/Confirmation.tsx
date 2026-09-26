import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import AddToDriveOutlinedIcon from '@mui/icons-material/AddToDriveOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import type { Dayjs } from 'dayjs'

export type BookingSummaryDetails = {
  reference: string
  serviceName: string
  duration: number
  date: Dayjs
  time: string
  timeZone: string
  meetingType: string
  fullName: string
  email: string
}

// paid: Stripe confirmed payment · due: online payment still needed · offline: staff arrange payment
export type ConfirmationPayment = 'paid' | 'due' | 'offline'

export function Confirmation({ booking, payment, paymentError, paying, onPay, onRestart }: { booking: BookingSummaryDetails; payment: ConfirmationPayment; paymentError?: string; paying?: boolean; onPay?: () => void; onRestart: () => void }) {
  const { reference } = booking
  const downloadIcs = () => {
    const start = booking.date.format('YYYYMMDD')
    const file = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}T140000Z\nDURATION:PT${booking.duration}M\nSUMMARY:${booking.serviceName}\nDESCRIPTION:Booking ${reference}\nEND:VEVENT\nEND:VCALENDAR`
    const url = URL.createObjectURL(new Blob([file], { type: 'text/calendar' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${reference}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.serviceName)}&details=${encodeURIComponent(`Iman Logistics booking ${reference}`)}`
  const confirmed = payment !== 'due'
  return (
    <Box maxWidth={780} mx="auto" textAlign="center">
      {confirmed ? <CheckCircleIcon color="success" sx={{ fontSize: 76 }} /> : <ScheduleRoundedIcon color="warning" sx={{ fontSize: 76 }} />}
      <Typography component="h2" variant="h3" color="primary" fontWeight={900} mt={2}>
        {payment === 'paid' ? 'Payment received — your consultation is confirmed' : payment === 'due' ? 'Complete payment to confirm your time' : 'Your booking request was received'}
      </Typography>
      <Typography color="text.secondary" fontSize={18} mt={1}>
        {payment === 'offline' ? `Our team will contact you at ${booking.email} to arrange payment and confirm your appointment.` : payment === 'due' ? 'Your time is held briefly while you pay. Unpaid bookings are released automatically.' : `A confirmation and appointment updates will be sent to ${booking.email}.`}
      </Typography>
      <Chip label={`Booking reference: ${reference}`} color="primary" sx={{ mt: 3, fontWeight: 800 }} />
      {paymentError && <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>{paymentError}</Alert>}
      {payment === 'due' && onPay && <Button variant="contained" size="large" startIcon={<LockOutlinedIcon />} onClick={onPay} disabled={paying} sx={{ mt: 3 }}>{paying ? 'Opening secure checkout…' : 'Pay now with Stripe'}</Button>}
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mt: 4, borderRadius: 3, textAlign: 'left', borderColor: 'divider' }}>
        <Typography variant="h5" color="primary" fontWeight={800}>{booking.serviceName}</Typography>
        <Typography mt={2}><strong>Date:</strong> {booking.date.format('dddd, MMMM D, YYYY')}</Typography>
        <Typography><strong>Time:</strong> {booking.time} ({booking.timeZone})</Typography>
        <Typography><strong>Duration:</strong> {booking.duration} minutes</Typography>
        <Typography><strong>Meeting:</strong> {booking.meetingType}</Typography>
        <Typography><strong>Guest:</strong> {booking.fullName}</Typography>
      </Paper>
      {confirmed && <>
        <Alert severity="success" icon={<EventAvailableOutlinedIcon />} sx={{ mt: 3, textAlign: 'left' }}>Meeting instructions will be included in your confirmation email.</Alert>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={1.5} mt={4}>
          <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={downloadIcs}>Download ICS</Button>
          <Button variant="outlined" startIcon={<AddToDriveOutlinedIcon />} href={googleUrl} target="_blank">Google Calendar</Button>
          <Button variant="outlined" startIcon={<CalendarMonthOutlinedIcon />} disabled>Outlook Calendar</Button>
        </Stack>
      </>}
      <Button variant={confirmed ? 'contained' : 'text'} size="large" onClick={onRestart} sx={{ mt: 4, display: 'block', mx: 'auto' }}>Book another consultation</Button>
    </Box>
  )
}

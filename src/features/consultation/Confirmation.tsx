import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import AddToDriveOutlinedIcon from '@mui/icons-material/AddToDriveOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import type { BookingPayload } from './bookingService'

export function Confirmation({ booking, reference, onRestart }: { booking: BookingPayload; reference: string; onRestart: () => void }) {
  const downloadIcs = () => {
    const start = booking.date.format('YYYYMMDD')
    const file = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}T140000Z\nDURATION:PT${booking.service.duration}M\nSUMMARY:${booking.service.name}\nDESCRIPTION:Booking ${reference}\nEND:VEVENT\nEND:VCALENDAR`
    const url = URL.createObjectURL(new Blob([file], { type: 'text/calendar' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${reference}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service.name)}&details=${encodeURIComponent(`Iman Logistics booking ${reference}`)}`
  return (
    <Box maxWidth={780} mx="auto" textAlign="center">
      <CheckCircleIcon color="success" sx={{ fontSize: 76 }} />
      <Typography component="h2" variant="h3" color="primary" fontWeight={900} mt={2}>Your consultation is confirmed</Typography>
      <Typography color="text.secondary" fontSize={18} mt={1}>A confirmation and appointment updates will be sent to {booking.email}.</Typography>
      <Chip label={`Booking reference: ${reference}`} color="primary" sx={{ mt: 3, fontWeight: 800 }} />
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mt: 4, borderRadius: 3, textAlign: 'left', borderColor: 'divider' }}>
        <Typography variant="h5" color="primary" fontWeight={800}>{booking.service.name}</Typography>
        <Typography mt={2}><strong>Date:</strong> {booking.date.format('dddd, MMMM D, YYYY')}</Typography>
        <Typography><strong>Time:</strong> {booking.time} ({booking.timeZone})</Typography>
        <Typography><strong>Duration:</strong> {booking.service.duration} minutes</Typography>
        <Typography><strong>Meeting:</strong> {booking.meetingType}</Typography>
        <Typography><strong>Guest:</strong> {booking.fullName}</Typography>
      </Paper>
      <Alert severity="success" icon={<EventAvailableOutlinedIcon />} sx={{ mt: 3, textAlign: 'left' }}>Meeting instructions will be included in your confirmation email.</Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={1.5} mt={4}>
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={downloadIcs}>Download ICS</Button>
        <Button variant="outlined" startIcon={<AddToDriveOutlinedIcon />} href={googleUrl} target="_blank">Google Calendar</Button>
        <Button variant="outlined" startIcon={<CalendarMonthOutlinedIcon />} disabled>Outlook Calendar</Button>
      </Stack>
      <Button variant="contained" size="large" onClick={onRestart} sx={{ mt: 4 }}>Book another consultation</Button>
    </Box>
  )
}

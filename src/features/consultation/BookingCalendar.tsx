import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import dayjs, { type Dayjs } from 'dayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { availableSlots } from './consultationData'

export function BookingCalendar({
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  date: Dayjs
  time: string
  onDateChange: (value: Dayjs) => void
  onTimeChange: (value: string) => void
}) {
  const disableDate = (value: Dayjs) => value.day() === 0 || value.day() === 6 || value.isBefore(dayjs(), 'day')
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderColor: 'divider', borderRadius: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              value={date}
              onChange={value => value && onDateChange(value)}
              shouldDisableDate={disableDate}
              disablePast
              sx={{ width: '100%', maxWidth: 430 }}
            />
          </LocalizationProvider>
          <Stack direction="row" spacing={1} justifyContent="center" pb={1}>
            <Chip size="small" label="Mon–Fri" variant="outlined" />
            <Chip size="small" label="9:00 AM–5:00 PM" icon={<AccessTimeIcon />} variant="outlined" />
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ p: 3, borderColor: 'divider', borderRadius: 3, height: '100%' }}>
          <Typography variant="h6" color="primary" fontWeight={800}>Available times</Typography>
          <Typography color="text.secondary" mb={3}>{date.format('dddd, MMMM D')}</Typography>
          <Box role="radiogroup" aria-label="Available consultation times" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
            {availableSlots.map(slot => (
              <Button
                key={slot.time}
                role="radio"
                aria-checked={time === slot.time}
                disabled={!slot.available}
                variant={time === slot.time ? 'contained' : 'outlined'}
                onClick={() => onTimeChange(slot.time)}
                sx={{ py: 1.25 }}
              >
                {slot.time}
              </Button>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mt={3}>Times shown in your detected time zone.</Typography>
        </Paper>
      </Grid>
    </Grid>
  )
}

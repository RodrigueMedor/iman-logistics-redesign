import { Button, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  phone: z.string().regex(/^[+()\d\s.-]{7,20}$/, 'Enter a valid phone number'),
  company: z.string().max(100).optional(),
  meetingType: z.string().min(1, 'Select a meeting type'),
  message: z.string().trim().min(20, 'Please provide at least 20 characters'),
})
export type BookingFormValues = z.infer<typeof schema>

export function BookingForm({
  defaultValues,
  onContinue,
}: {
  defaultValues?: Partial<BookingFormValues>
  onContinue: (values: BookingFormValues) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { meetingType: 'Google Meet', ...defaultValues },
  })
  return (
    <Paper component="form" onSubmit={handleSubmit(onContinue)} noValidate variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, borderColor: 'divider' }}>
      <Typography variant="h5" color="primary" fontWeight={800} mb={3}>Tell us about you</Typography>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Full Name" autoComplete="name" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Email Address" type="email" autoComplete="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Phone Number" autoComplete="tel" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Company Name (optional)" autoComplete="organization" {...register('company')} error={!!errors.company} helperText={errors.company?.message} /></Grid>
        <Grid size={12}>
          <TextField select fullWidth label="Meeting Type" {...register('meetingType')} error={!!errors.meetingType} helperText={errors.meetingType?.message}>
            {['Google Meet', 'Zoom', 'Microsoft Teams', 'Phone Call', 'In Person'].map(value => <MenuItem value={value} key={value}>{value}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={12}><TextField fullWidth multiline minRows={5} label="Message / Project Description" {...register('message')} error={!!errors.message} helperText={errors.message?.message || 'Share your goals, challenges, and what you would like to accomplish.'} /></Grid>
        <Grid size={12}><Button size="large" type="submit" variant="contained" sx={{ minWidth: 190 }}>Review booking</Button></Grid>
      </Grid>
    </Paper>
  )
}

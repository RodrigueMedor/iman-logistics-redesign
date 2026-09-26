import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { callFunction, fileMeta, uploadToSlot } from '../../services/api'

const schema = z.object({
  position: z.string().min(1, 'Select a position'),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  phone: z.string().regex(/^[+()\d\s.-]{7,20}$/, 'Enter a valid phone number'),
  location: z.string().max(120, 'Location is too long').optional(),
  experience: z.string().max(120).optional(),
  coverLetter: z.string().max(5000, 'Please keep this under 5,000 characters').optional(),
})
type ApplicationValues = z.infer<typeof schema>

const experienceOptions = ['Less than 1 year', '1–2 years', '3–5 years', '6–10 years', 'More than 10 years']

export function ApplicationForm({ positions, position, onPositionChange }: { positions: string[]; position: string; onPositionChange: (value: string) => void }) {
  const [resume, setResume] = useState<File>()
  const [fileError, setFileError] = useState('')
  const [reference, setReference] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<ApplicationValues>({
    resolver: zodResolver(schema),
    defaultValues: { position, experience: '' },
  })
  useEffect(() => { setValue('position', position) }, [position, setValue])

  const onFile = (files: FileList | null) => {
    const file = files?.[0]
    setFileError('')
    if (!file) return setResume(undefined)
    if (file.size > 5 * 1024 * 1024) return setFileError('File must be 5 MB or smaller')
    setResume(file)
  }

  const onSubmit = async (values: ApplicationValues) => {
    setReference('')
    setSubmitError('')
    try {
      const result = await callFunction<{ reference: string; upload: { path: string; token: string } | null }>('submit-application', { ...values, website: honeypot, resume: fileMeta(resume) })
      await uploadToSlot(result.upload, resume)
      setReference(result.reference)
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setResume(undefined)
      reset({ position, experience: '' })
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : 'Your application could not be sent. Please try again.')
    }
  }

  return <Paper component="form" onSubmit={handleSubmit(onSubmit)} noValidate variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
    {reference && <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}><strong>Application received.</strong> Thank you for your interest. Your reference is {reference}.</Alert>}
    {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}
    <Box component="input" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={event => setHoneypot(event.target.value)} sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
    <Grid container spacing={2.5}>
      <Grid size={12}><TextField select fullWidth label="Position" {...register('position')} value={position} onChange={event => { onPositionChange(event.target.value); setValue('position', event.target.value) }} error={!!errors.position} helperText={errors.position?.message}>{positions.map(item => <MenuItem value={item} key={item}>{item}</MenuItem>)}</TextField></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Full Name" autoComplete="name" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Email Address" type="email" autoComplete="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Phone Number" autoComplete="tel" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="City and state (optional)" autoComplete="address-level2" {...register('location')} error={!!errors.location} helperText={errors.location?.message} /></Grid>
      <Grid size={12}><TextField select fullWidth label="Relevant experience (optional)" defaultValue="" {...register('experience')}><MenuItem value="">Prefer not to say</MenuItem>{experienceOptions.map(item => <MenuItem value={item} key={item}>{item}</MenuItem>)}</TextField></Grid>
      <Grid size={12}><TextField fullWidth multiline minRows={5} label="Tell us about yourself (optional)" {...register('coverLetter')} error={!!errors.coverLetter} helperText={errors.coverLetter?.message || 'Share your experience, licenses, and availability.'} /></Grid>
      <Grid size={12}>
        <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} sx={{ mr: 2 }}>Attach resume<input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => onFile(event.target.files)} /></Button>
        <Typography component="span" variant="body2" color={fileError ? 'error' : 'text.secondary'}>{fileError || (resume ? `${resume.name} · ${(resume.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, DOC, DOCX, PNG or JPG · max 5 MB')}</Typography>
      </Grid>
      <Grid size={12}><Button type="submit" variant="contained" size="large" disabled={isSubmitting || !!fileError} startIcon={isSubmitting ? <CircularProgress color="inherit" size={18} /> : <SendOutlinedIcon />}>{isSubmitting ? 'Sending…' : 'Submit application'}</Button></Grid>
    </Grid>
  </Paper>
}

import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import PasswordRoundedIcon from '@mui/icons-material/PasswordRounded'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { supabase } from '../lib/supabase'

export default function AdminResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 10) return setError('Use a password with at least 10 characters.')
    if (password !== confirmation) return setError('The passwords do not match.')
    if (!supabase) return setError('Password recovery is not configured.')
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(updateError.message.includes('Auth session missing') ? 'This reset link has expired. Request a new password reset email.' : updateError.message)
    await supabase.auth.signOut()
    navigate('/admin/login/', { replace: true, state: { passwordReset: true } })
  }

  return <>
    <Seo title="Reset Password | Iman Logistics" canonical="/admin/reset-password/" />
    <Box sx={{ bgcolor: 'primary.main', minHeight: '72vh', py: { xs: 8, md: 12 }, display: 'grid', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper component="form" onSubmit={submit} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 5 }}>
          <Stack spacing={2.5}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'action.selected', color: 'primary.main' }}><PasswordRoundedIcon /></Box>
            <Box><Typography variant="h3" fontWeight={900}>Choose a new password</Typography><Typography color="text.secondary" mt={1}>Enter a secure password for your Iman Logistics account.</Typography></Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField required type="password" label="New password" autoComplete="new-password" inputProps={{ minLength: 10 }} value={password} onChange={event => setPassword(event.target.value)} helperText="Use at least 10 characters." />
            <TextField required type="password" label="Confirm new password" autoComplete="new-password" inputProps={{ minLength: 10 }} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
            <Button type="submit" size="large" variant="contained" disabled={saving}>{saving ? 'Updating password…' : 'Update password'}</Button>
            <Button component={RouterLink} to="/admin/login/">Return to sign in</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  </>
}

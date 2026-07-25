import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const { configured, user, profile, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && profile) return <Navigate to={profile.role === 'super_admin' ? '/tracking/admin/work-orders/' : '/tracking/team/work-orders/'} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const message = await signIn(email.trim(), password)
    setSubmitting(false)
    if (message) return setError(message)
    const normalizedLogin = email.trim().toLowerCase()
    let role: 'super_admin' | 'employee' = ['superadmin', 'superadmin@imanlogistics.com'].includes(normalizedLogin) && import.meta.env.DEV
      ? 'super_admin'
      : 'employee'
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        const { data: signedInProfile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single()
        role = signedInProfile?.role === 'super_admin' ? 'super_admin' : 'employee'
      }
    }
    const requested = (location.state as { from?: string } | null)?.from
    navigate(role === 'super_admin' ? requested || '/tracking/admin/work-orders/' : '/tracking/team/work-orders/', { replace: true })
  }

  return <>
    <Seo title="Team Sign In | Iman Logistics" canonical="/admin/login/" />
    <Box sx={{ bgcolor: 'primary.main', minHeight: '72vh', py: { xs: 8, md: 12 }, display: 'grid', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper component="form" onSubmit={submit} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 5 }}>
          <Stack spacing={2.5}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'action.selected', color: 'primary.main' }}><LockOutlinedIcon /></Box>
            <Box><Typography variant="h3" fontWeight={900}>Team sign in</Typography><Typography color="text.secondary" mt={1}>Use the email and password provided by your super admin.</Typography></Box>
            {!configured && <Alert severity="warning">Authentication has not been configured for this deployment.</Alert>}
            {import.meta.env.DEV && <Alert severity="info"><strong>Local test access</strong><br />Username: superadmin<br />Password: Admin123!</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField required type={import.meta.env.DEV ? 'text' : 'email'} label={import.meta.env.DEV ? 'Username or email' : 'Email address'} autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} />
            <TextField required type="password" label="Password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
            <Button type="submit" size="large" variant="contained" disabled={!configured || submitting}>{submitting ? 'Signing in…' : 'Sign in securely'}</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  </>
}

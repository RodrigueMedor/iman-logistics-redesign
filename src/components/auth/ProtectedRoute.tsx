import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type AppRole } from '../../contexts/AuthContext'

export function ProtectedRoute({ roles }: { roles: AppRole[] }) {
  const { configured, loading, user, profile, signOut } = useAuth()
  const location = useLocation()

  if (!configured) return <Container sx={{ py: 10 }}><Paper sx={{ p: 5, maxWidth: 720, mx: 'auto', borderRadius: 4 }}><Stack spacing={2} alignItems="flex-start"><LockOutlinedIcon color="primary" sx={{ fontSize: 48 }} /><Typography variant="h4" fontWeight={900}>Secure dashboard setup required</Typography><Alert severity="info">Add the Supabase values from <strong>.env.example</strong>, run the included database migration, and create the first super-admin account.</Alert></Stack></Paper></Container>
  if (loading) return <Box minHeight="55vh" display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>
  if (!user) return <Navigate to="/admin/login/" replace state={{ from: location.pathname }} />
  if (!profile?.active || !profile.role || !roles.includes(profile.role)) {
    return <Container sx={{ py: 10 }}><Paper sx={{ p: 5, maxWidth: 650, mx: 'auto', borderRadius: 4 }}><Stack spacing={2}><Typography variant="h4" fontWeight={900}>Access restricted</Typography><Typography color="text.secondary">Your account does not have permission to open this dashboard.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><Button component={RouterLink} to="/tracking/team/work-orders/" variant="contained">Go to My Work Orders</Button><Button onClick={() => void signOut()} variant="outlined">Sign out</Button></Stack></Stack></Paper></Container>
  }
  return <Outlet />
}

import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, Button, Chip, Container, Grid, Paper, Stack, Tooltip, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../../components/common/Seo'
import { useAuth } from '../../contexts/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { dashboardStats, formatDateTime, formatMoney, recentActivity, type DashboardStats } from '../../services/backoffice'

type Activity = Awaited<ReturnType<typeof recentActivity>>[number]

const barColor = '#2f3fbf'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>()
  const [activity, setActivity] = useState<Activity[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    Promise.all([dashboardStats(), recentActivity(6)])
      .then(([nextStats, nextActivity]) => { setStats(nextStats); setActivity(nextActivity) })
      .catch(() => setError('Dashboard data could not be loaded. Check that the latest migrations have been applied.'))
  }, [])

  return <>
    <Seo title="Dashboard | Iman Logistics Back Office" canonical="/admin/" />
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography component="h1" variant="h4" fontWeight={950}>Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Typography>
      <Typography color="text.secondary" mt={.5} mb={4}>What needs attention across the website today.</Typography>

      {!isSupabaseConfigured && <Alert severity="info" sx={{ mb: 3 }}>The back office needs Supabase. Add the values from <strong>.env.example</strong> and run the migrations in <strong>supabase/migrations</strong>.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2.5}>
        <StatTile icon={<MailOutlineRoundedIcon />} label="New messages" value={stats?.contacts.new} detail={stats && `${stats.contacts.last7Days} in the last 7 days · ${stats.contacts.total} total`} to="/admin/contacts/" />
        <StatTile icon={<EventAvailableOutlinedIcon />} label="Upcoming bookings" value={stats?.bookings.upcoming} detail={stats && `${stats.bookings.pending} awaiting confirmation · ${stats.bookings.unpaid} unpaid`} to="/admin/bookings/" />
        <StatTile icon={<WorkOutlineRoundedIcon />} label="New applications" value={stats?.applications.new} detail={stats && `${stats.applications.inProgress} in review · ${stats.applications.total} total`} to="/admin/applications/" />
        <StatTile icon={<SchoolOutlinedIcon />} label="Dispatch Masterclass registrations" value={stats?.brokerRegistrations.confirmed} detail={stats && `confirmed · ${stats.brokerRegistrations.awaitingPayment} awaiting payment · ${stats.brokerRegistrations.total} total`} to="/admin/freight-broker/" />
        <StatTile icon={<PaymentsOutlinedIcon />} label="Paid, last 30 days" value={stats && formatMoney(stats.payments.paidLast30DaysCents)} detail={stats && `${formatMoney(stats.payments.paidCents)} all time · ${stats.payments.pending} pending`} to="/admin/payments/" />
        <StatTile icon={<LocalShippingOutlinedIcon />} label="Shipments in transit" value={stats?.shipments.inTransit} detail={stats && `${stats.shipments.exceptions} exceptions · ${stats.shipments.total} total`} to="/admin/shipments/" />
        <StatTile icon={<PeopleAltOutlinedIcon />} label="Customers" value={stats?.customers} detail="Unique people across all forms" to="/admin/customers/" />
      </Grid>

      <Grid container spacing={2.5} mt={.5} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Typography fontWeight={900}>Website submissions per day</Typography>
            <Typography variant="body2" color="text.secondary">Messages, bookings, applications, and registrations · last 14 days{stats ? ` · ${stats.daily.reduce((sum, item) => sum + item.count, 0)} total` : ''}</Typography>
            {stats && <DailyChart data={stats.daily} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Typography fontWeight={900} mb={2}>Latest submissions</Typography>
            <Stack spacing={1.25}>
              {activity.map(item => <Box key={`${item.kind}-${item.id}`} component={RouterLink} to={item.path} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'action.selected' } }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" fontWeight={800} noWrap>{item.full_name} · {item.title}</Typography><Chip size="small" label={item.kind} /></Stack>
                <Typography variant="caption" color="text.secondary">{item.reference} · {formatDateTime(item.created_at)}</Typography>
              </Box>)}
              {stats && !activity.length && <Typography color="text.secondary">No submissions yet.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  </>
}

function StatTile({ icon, label, value, detail, to }: { icon: ReactNode; label: string; value?: ReactNode; detail?: ReactNode; to: string }) {
  return <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider', height: '100%' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" color="text.secondary">{icon}<Typography fontWeight={800} fontSize={14}>{label}</Typography></Stack>
      <Typography fontSize={34} fontWeight={950} mt={1}>{value ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary" minHeight={20}>{detail}</Typography>
      <Button component={RouterLink} to={to} size="small" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1, ml: -1 }}>Open</Button>
    </Paper>
  </Grid>
}

// Single-series column chart: one hue, no legend, per-column tooltip, peak labelled.
function DailyChart({ data }: { data: DashboardStats['daily'] }) {
  const max = Math.max(1, ...data.map(item => item.count))
  const peak = data.reduce((best, item) => item.count > best.count ? item : best, data[0])
  const label = (day: string, style: 'short' | 'long') => new Intl.DateTimeFormat('en-US', style === 'short' ? { month: 'numeric', day: 'numeric', timeZone: 'UTC' } : { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
  return <Box mt={3}>
    <Box role="img" aria-label={`Daily submissions: ${data.map(item => `${label(item.day, 'long')} ${item.count}`).join(', ')}`} sx={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: '2px', alignItems: 'end', height: 180, borderBottom: '1px solid', borderColor: 'divider' }}>
      {data.map(item => <Tooltip key={item.day} title={`${label(item.day, 'long')}: ${item.count} submission${item.count === 1 ? '' : 's'}`} placement="top" arrow>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'default' }}>
          {peak.count > 0 && item.day === peak.day && <Typography variant="caption" fontWeight={800} color="text.primary">{item.count}</Typography>}
          <Box sx={{ width: '100%', maxWidth: 24, height: `${(item.count / max) * 150}px`, minHeight: item.count ? 3 : 0, bgcolor: barColor, borderRadius: '4px 4px 0 0' }} />
        </Box>
      </Tooltip>)}
    </Box>
    <Box aria-hidden sx={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: '2px', mt: .75 }}>
      {data.map((item, index) => {
        const edge = index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'center'
        const shown = index === 0 || index === data.length - 1 || index === Math.floor(data.length / 2)
        return <Typography key={item.day} variant="caption" color="text.secondary" sx={{ visibility: shown ? 'visible' : 'hidden', justifySelf: edge, whiteSpace: 'nowrap', fontSize: 11 }}>{label(item.day, 'short')}</Typography>
      })}
    </Box>
  </Box>
}

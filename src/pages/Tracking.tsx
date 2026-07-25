import { FormEvent, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { Reveal } from '../components/common/Reveal'
import { demoTrackingReferences, trackShipment, type ShipmentTracking } from '../services/tracking'

export default function Tracking() {
  const [reference, setReference] = useState('')
  const [shipment, setShipment] = useState<ShipmentTracking | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const runTracking = async (normalizedReference: string) => {
    if (!normalizedReference) {
      setError('Enter a tracking or load number.')
      return
    }

    setReference(normalizedReference)
    setError('')
    setLoading(true)
    setSearched(false)
    setShipment(null)

    try {
      const result = await trackShipment(normalizedReference)
      setShipment(result)
      setSearched(true)
    } catch {
      setError('Tracking is temporarily unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void runTracking(reference.trim().toUpperCase())
  }

  const useDemoReference = (demoReference: string) => {
    setReference(demoReference)
    setShipment(null)
    setSearched(false)
    setError('')
  }

  return <>
    <Seo title="Track a Shipment | Iman Logistics" canonical="/tracking/" />

    <Box sx={{ position: 'relative', overflow: 'hidden', color: 'white', background: 'linear-gradient(125deg, #05002f 0%, #0A005A 58%, #2416a8 100%)', py: { xs: 8, md: 11 } }}>
      <Box sx={{ position: 'absolute', width: 480, height: 480, right: -120, top: -280, borderRadius: '50%', border: '85px solid rgba(255,255,255,.04)' }} />
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={5} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Reveal>
              <Chip label="REAL-TIME SHIPMENT VISIBILITY" color="secondary" sx={{ fontWeight: 900, mb: 2.5, letterSpacing: '.06em' }} />
              <Typography component="h1" sx={{ maxWidth: 700, fontSize: { xs: 43, sm: 54, md: 68 }, lineHeight: 1.03, fontWeight: 900, letterSpacing: '-.04em' }}>Know where your shipment stands.</Typography>
              <Typography mt={2.5} fontSize={{ xs: 18, md: 21 }} color="rgba(255,255,255,.8)" maxWidth={650}>Enter your Iman tracking or load number to view the latest status, route progress, estimated delivery, and shipment milestones.</Typography>
              <Stack direction="row" spacing={3} mt={4} flexWrap="wrap" useFlexGap>
                {['Status updates', 'Route progress', 'Delivery estimate'].map(item => <Typography key={item} fontWeight={700} fontSize={14}>✓ {item}</Typography>)}
              </Stack>
            </Reveal>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Reveal delay={100}>
              <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: { xs: 3, sm: 4 }, borderRadius: 5, boxShadow: '0 28px 70px rgba(0,0,0,.24)' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                  <Box sx={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 2.5, bgcolor: 'action.selected', color: 'primary.main' }}><LocalShippingOutlinedIcon /></Box>
                  <Box><Typography variant="h5" fontWeight={900}>Track your shipment</Typography><Typography variant="body2" color="text.secondary">Use the reference from your confirmation.</Typography></Box>
                </Stack>
                <TextField
                  fullWidth
                  value={reference}
                  onChange={event => { setReference(event.target.value); setError('') }}
                  error={Boolean(error)}
                  helperText={error || 'Choose a test reference below or enter your own.'}
                  label="Tracking or load number"
                  placeholder="Example: IMAN-12345"
                  autoComplete="off"
                  slotProps={{ htmlInput: { maxLength: 40 }, input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment> } }}
                />
                <Button type="submit" disabled={loading} fullWidth size="large" variant="contained" sx={{ mt: 2, minHeight: 50 }}>
                  {loading ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1.25 }} /> Checking shipment…</> : 'Track shipment'}
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" mt={2} mb={1}>Test references</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {demoTrackingReferences.map(item => <Chip key={item} label={item} clickable onClick={() => useDemoReference(item)} color={reference === item ? 'primary' : 'default'} />)}
                </Stack>
              </Paper>
            </Reveal>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 7, md: 10 } }}>
      <Box aria-live="polite" aria-busy={loading}>
        {loading && <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center', border: 1, borderColor: 'divider' }}><CircularProgress /><Typography fontWeight={800} mt={2}>Finding your shipment…</Typography></Paper>}

        {!loading && searched && !shipment && (
          <Alert severity="warning" sx={{ alignItems: 'center', borderRadius: 3, py: 2 }}>
            <Typography fontWeight={900}>We couldn’t find that reference.</Typography>
            <Typography variant="body2">Check the number and try again, or contact support if the shipment was created recently.</Typography>
          </Alert>
        )}

        {!loading && shipment && <TrackingResult shipment={shipment} onRefresh={() => void runTracking(shipment.reference)} />}

        {!loading && !searched && !shipment && (
          <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, textAlign: 'center', border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
            <RouteOutlinedIcon color="primary" sx={{ fontSize: 50 }} />
            <Typography variant="h4" fontWeight={900} mt={2}>Your shipment journey will appear here</Typography>
            <Typography color="text.secondary" mt={1} mx="auto" maxWidth={640}>Enter a reference above to see its current status and milestone history. Choose any of the test references shown in the tracking form.</Typography>
          </Paper>
        )}
      </Box>

      <Paper sx={{ mt: 5, p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center"><SupportAgentOutlinedIcon color="primary" sx={{ fontSize: 38 }} /><Box><Typography fontWeight={900}>Need help with a shipment?</Typography><Typography color="text.secondary">Our team can help verify your reference and latest status.</Typography></Box></Stack>
          <Button component={RouterLink} to="/contact-us/" variant="outlined">Contact support</Button>
        </Stack>
      </Paper>
    </Container>
  </>
}

function TrackingResult({ shipment, onRefresh }: { shipment: ShipmentTracking; onRefresh: () => void }) {
  return <Stack spacing={4}>
    <Paper sx={{ overflow: 'hidden', borderRadius: 4, border: 1, borderColor: 'divider' }}>
      <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box><Typography variant="overline" sx={{ opacity: .7, letterSpacing: '.12em' }}>Tracking reference</Typography><Typography variant="h4" fontWeight={900}>{shipment.reference}</Typography></Box>
          <Chip label={shipment.status} color="secondary" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 900, fontSize: 14 }} />
        </Stack>
      </Box>
      <Box sx={{ p: { xs: 3, md: 4 } }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}><SummaryItem icon={<PlaceOutlinedIcon />} label="From" value={shipment.origin} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><SummaryItem icon={<RouteOutlinedIcon />} label="To" value={shipment.destination} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><SummaryItem icon={<ScheduleOutlinedIcon />} label="Estimated delivery" value={shipment.estimatedDelivery} /></Grid>
        </Grid>
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" justifyContent="space-between" mb={1}><Typography fontWeight={800}>Route progress</Typography><Typography color="primary" fontWeight={900}>{shipment.progress}%</Typography></Stack>
          <LinearProgress variant="determinate" value={shipment.progress} sx={{ height: 10, borderRadius: 10 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} mt={1.5}><Typography variant="body2" color="text.secondary">Last updated: {shipment.lastUpdated}</Typography><Button size="small" startIcon={<RefreshRoundedIcon />} onClick={onRefresh}>Refresh status</Button></Stack>
        </Box>
      </Box>
    </Paper>

    <Box>
      <Typography component="h2" variant="h4" fontWeight={900} mb={3}>Shipment timeline</Typography>
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <Stack>
          {shipment.events.map((item, index) => <Stack key={item.label} direction="row" spacing={2.5} sx={{ position: 'relative', pb: index === shipment.events.length - 1 ? 0 : 3.5, '&::before': index === shipment.events.length - 1 ? undefined : { content: '""', position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, bgcolor: item.completed ? 'primary.main' : 'divider' } }}><Box sx={{ position: 'relative', zIndex: 1, bgcolor: 'background.paper', lineHeight: 0 }}>{item.completed ? <CheckCircleIcon color="primary" /> : <CircleOutlinedIcon color="disabled" />}</Box><Box sx={{ flex: 1, pb: .5 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={.5}><Typography fontWeight={900} color={item.completed ? 'text.primary' : 'text.secondary'}>{item.label}</Typography><Typography variant="body2" color="text.secondary">{item.timestamp}</Typography></Stack><Typography variant="body2" color="primary" fontWeight={700} mt={.35}>{item.location}</Typography><Typography variant="body2" color="text.secondary" mt={.5}>{item.detail}</Typography></Box></Stack>)}
        </Stack>
      </Paper>
    </Box>
  </Stack>
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Stack direction="row" spacing={1.5} alignItems="flex-start"><Box sx={{ color: 'primary.main', mt: .25 }}>{icon}</Box><Box><Typography variant="body2" color="text.secondary">{label}</Typography><Typography fontWeight={900} mt={.25}>{value}</Typography></Box></Stack>
}

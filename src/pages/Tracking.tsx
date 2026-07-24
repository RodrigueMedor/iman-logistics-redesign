import { FormEvent, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import { Seo } from '../components/common/Seo'
import { Reveal } from '../components/common/Reveal'

const benefits = [
  [RouteOutlinedIcon, 'Clear shipment visibility', 'See the latest available milestone for your load in one simple view.'],
  [NotificationsActiveOutlinedIcon, 'Timely status updates', 'Stay informed as your freight moves through each stage of its journey.'],
  [CheckCircleOutlineIcon, 'Reliable coordination', 'Use your tracking reference when speaking with our logistics support team.'],
] as const

export default function Tracking() {
  const [reference, setReference] = useState('')
  const [submittedReference, setSubmittedReference] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedReference = reference.trim().toUpperCase()
    if (normalizedReference) setSubmittedReference(normalizedReference)
  }

  return (
    <>
      <Seo title="Shipment Tracking - Iman Logistics" canonical="/tracking/" />
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={5} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Reveal>
                <Chip label="SHIPMENT VISIBILITY" color="secondary" sx={{ fontWeight: 800, mb: 2.5 }} />
                <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 42, md: 66 }, lineHeight: 1.04 }}>
                  Track your shipment with confidence
                </Typography>
                <Typography mt={2.5} fontSize={{ xs: 18, md: 21 }} color="rgba(255,255,255,.8)" maxWidth={720}>
                  Enter your shipment or load reference to request the latest available tracking information.
                </Typography>
              </Reveal>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Reveal delay={100}>
                <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                    <LocalShippingOutlinedIcon color="primary" fontSize="large" />
                    <Typography variant="h5" fontWeight={900}>Find your shipment</Typography>
                  </Stack>
                  <TextField
                    fullWidth
                    required
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    label="Tracking or load number"
                    placeholder="Example: IMAN-12345"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment>,
                      },
                    }}
                  />
                  <Button type="submit" fullWidth size="large" variant="contained" sx={{ mt: 2 }}>Track shipment</Button>
                  {submittedReference && (
                    <Box role="status" sx={{ mt: 2.5, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography fontWeight={800}>Reference: {submittedReference}</Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Your request is ready. Contact our team with this reference for the latest verified shipment status.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Reveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 8, md: 11 } }}>
        <Typography variant="h3" textAlign="center" color="primary" fontWeight={900}>Stay informed from pickup to delivery</Typography>
        <Grid container spacing={3} mt={3}>
          {benefits.map(([Icon, title, description], index) => (
            <Grid size={{ xs: 12, md: 4 }} key={title}>
              <Reveal delay={index * 80}>
                <Paper sx={{ height: '100%', p: 3.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
                  <Icon color="primary" sx={{ fontSize: 42 }} />
                  <Typography variant="h6" fontWeight={900} mt={2}>{title}</Typography>
                  <Typography color="text.secondary" mt={1}>{description}</Typography>
                </Paper>
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  )
}

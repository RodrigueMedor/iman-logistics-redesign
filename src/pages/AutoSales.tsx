import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { Reveal } from '../components/common/Reveal'
import { VEHICLE_SALES_URL } from '../config/links'

const buyingSteps = [
  [DirectionsCarFilledOutlinedIcon, 'Explore available vehicles', 'Tell us the vehicle type, budget, and features that fit your needs.'],
  [FactCheckOutlinedIcon, 'Review the details', 'Receive clear vehicle information so you can make an informed decision.'],
  [HandshakeOutlinedIcon, 'Complete your purchase', 'Our team helps coordinate the next steps from inquiry through handoff.'],
] as const

export default function AutoSales() {
  return (
    <>
      <Seo title="Car & Truck Sales - Iman Logistics" canonical="/car-auto-sales/" />
      <Box sx={{
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(125deg, #070323 0%, #0A005A 100%)'
          : 'linear-gradient(125deg, #0A005A 0%, #2416a8 100%)',
        color: 'white',
        py: { xs: 9, md: 14 },
      }}>
        <Container>
          <Grid container spacing={5} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Reveal>
                <Chip label="IMAN CAR & TRUCK SALES" color="secondary" sx={{ fontWeight: 800, mb: 2.5 }} />
                <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 44, md: 70 }, lineHeight: 1.02 }}>
                  Find the right car or truck for your next move
                </Typography>
                <Typography mt={3} fontSize={{ xs: 18, md: 21 }} color="rgba(255,255,255,.8)" maxWidth={730}>
                  Explore our approach to car and commercial truck sales, then continue to our dedicated sales website to browse inventory and make an inquiry.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4}>
                  <Button component="a" href={VEHICLE_SALES_URL} target="_blank" rel="noopener noreferrer" size="large" color="secondary" variant="contained">Visit sales website ↗</Button>
                  <Button component={RouterLink} to="/contact-us/" size="large" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.7)' }}>Contact our team</Button>
                </Stack>
              </Reveal>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Reveal delay={120}>
                <Paper sx={{ p: { xs: 3.5, md: 5 }, borderRadius: 5, textAlign: 'center', bgcolor: 'rgba(255,255,255,.1)', color: 'white', border: '1px solid rgba(255,255,255,.22)', backdropFilter: 'blur(12px)' }}>
                  <DirectionsCarFilledOutlinedIcon sx={{ fontSize: 90, color: 'secondary.main' }} />
                  <Typography variant="h4" fontWeight={900} mt={2}>Cars and commercial trucks</Typography>
                  <Typography color="rgba(255,255,255,.76)" mt={1.5}>
                    Find personal vehicles for everyday needs and dependable trucks for work, hauling, and business growth.
                  </Typography>
                </Paper>
              </Reveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 8, md: 11 } }}>
        <Typography variant="h3" textAlign="center" color="primary" fontWeight={900}>A simpler way to buy</Typography>
        <Typography textAlign="center" color="text.secondary" fontSize={18} mt={1.5}>Personal guidance at every stage of your vehicle search.</Typography>
        <Grid container spacing={3} mt={3}>
          {buyingSteps.map(([Icon, title, description], index) => (
            <Grid size={{ xs: 12, md: 4 }} key={title}>
              <Reveal delay={index * 80}>
                <Paper sx={{ height: '100%', p: 4, borderRadius: 3, border: 1, borderColor: 'divider' }}>
                  <Icon color="primary" sx={{ fontSize: 44 }} />
                  <Typography variant="h6" fontWeight={900} mt={2}>{title}</Typography>
                  <Typography color="text.secondary" mt={1}>{description}</Typography>
                </Paper>
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 7, md: 9 }, textAlign: 'center' }}>
        <Container maxWidth="md">
          <SupportAgentOutlinedIcon color="secondary" sx={{ fontSize: 52 }} />
          <Typography variant="h3" mt={1.5}>Tell us what you’re looking for</Typography>
          <Typography color="rgba(255,255,255,.78)" fontSize={18} mt={1.5}>Continue to our dedicated sales website to explore vehicles and connect with the sales team.</Typography>
          <Button component="a" href={VEHICLE_SALES_URL} target="_blank" rel="noopener noreferrer" color="secondary" variant="contained" size="large" sx={{ mt: 3 }}>Visit Car & Truck Sales ↗</Button>
        </Container>
      </Box>
    </>
  )
}

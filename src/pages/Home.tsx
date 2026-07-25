import { useState } from 'react'
import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { Reveal } from '../components/common/Reveal'
import DispatchMasterclass from './DispatchMasterclass'
import truckHighway from '../assets/videos/truck-highway-banner.mp4'
import truckCanyon from '../assets/videos/truck-canyon-road.mp4'
import truckPort from '../assets/videos/truck-port-road.mp4'

const heroVideos = [
  [truckHighway, 'Truck driving through a mountain highway'],
  [truckCanyon, 'Aerial view of a truck crossing a canyon road'],
  [truckPort, 'Truck driving away through a freight port'],
] as const

const services = [
  [LocalShippingOutlinedIcon, 'Career training', 'Freight Dispatch Masterclass', 'Build practical dispatching skills with step-by-step training designed for real-world trucking operations.', '/freight-dispatch-masterclass/', 'Explore dispatch training'],
  [QueryStatsOutlinedIcon, 'Business training', 'Freight Broker Masterclass', 'Learn the foundations, workflows, and relationship-building skills needed to enter freight brokerage.', '/freight-broker-masterclass/', 'Explore broker training'],
  [SchoolOutlinedIcon, 'Driver education', 'Iman Trucking School', 'Move toward a professional driving career with education built around confidence, safety, and opportunity.', '/iman-trucking-school/', 'Visit trucking school'],
  [DirectionsCarFilledOutlinedIcon, 'Vehicle sales', 'Car & Truck Sales', 'Get personal support finding the right car or commercial truck for your next move.', '/car-auto-sales/', 'Learn about vehicle sales'],
] as const

const trustPoints = [
  ['Practical guidance', 'Clear next steps grounded in real logistics and transportation needs.'],
  ['Personal support', 'Responsive help from your first question through your next milestone.'],
  ['Multiple paths forward', 'Training, consulting, tracking, and vehicle solutions in one place.'],
] as const

export default function Home() {
  const [activeVideo, setActiveVideo] = useState(0)

  return <>
    <Seo title="Iman Logistics | Training, Consulting & Vehicle Solutions" canonical="/" />
    <Box component="section" aria-label="Iman Logistics on the road" sx={{ position: 'relative', overflow: 'hidden', minHeight: { xs: 650, md: 720 }, display: 'flex', alignItems: 'center', color: 'white', bgcolor: '#08062d' }}>
      <Box
        key={heroVideos[activeVideo][0]}
        component="video"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setActiveVideo(current => (current + 1) % heroVideos.length)}
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: { xs: '62% center', md: 'center' },
          animation: 'heroVideoFade 900ms ease',
          '@keyframes heroVideoFade': { from: { opacity: 0 }, to: { opacity: 1 } },
          '@media (prefers-reduced-motion: reduce)': { display: 'none' },
        }}
      >
        <source src={heroVideos[activeVideo][0]} type="video/mp4" />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, background: { xs: 'linear-gradient(90deg, rgba(4,3,30,.94) 0%, rgba(7,5,45,.73) 70%, rgba(4,3,30,.34) 100%)', md: 'linear-gradient(90deg, rgba(4,3,30,.94) 0%, rgba(7,5,45,.78) 36%, rgba(4,3,30,.28) 67%, rgba(4,3,30,.12) 100%)' } }} />
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(4,3,30,.45) 0%, transparent 38%)' }} />

      <Container sx={{ position: 'relative', zIndex: 1, py: { xs: 9, md: 14 } }}>
        <Reveal>
          <Chip label="YOUR NEXT MOVE STARTS HERE" sx={{ mb: 3, color: 'white', bgcolor: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)', backdropFilter: 'blur(10px)', fontWeight: 800, letterSpacing: '.08em' }} />
          <Typography component="h1" sx={{ maxWidth: 760, fontSize: { xs: 46, sm: 60, md: 78 }, lineHeight: 1.01, fontWeight: 900, letterSpacing: '-.045em', textShadow: '0 4px 24px rgba(0,0,0,.28)' }}>Build your future in logistics.</Typography>
          <Typography sx={{ maxWidth: 650, mt: 3, fontSize: { xs: 18, md: 22 }, lineHeight: 1.65, color: 'rgba(255,255,255,.84)', textShadow: '0 2px 14px rgba(0,0,0,.4)' }}>Training, consulting, and vehicle solutions designed to help ambitious people move forward with clarity.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4.5} alignItems={{ sm: 'center' }}>
            <Button component={RouterLink} to="/freight-dispatch-masterclass/" size="large" color="secondary" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Explore our services</Button>
            <Button component={RouterLink} to="/consultants/" size="large" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.62)', bgcolor: 'rgba(8,6,45,.18)', backdropFilter: 'blur(8px)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.1)' } }}>Speak with a consultant</Button>
          </Stack>
        </Reveal>

        <Stack direction="row" spacing={1} sx={{ mt: { xs: 7, md: 9 } }} aria-label="Choose background video">
          {heroVideos.map(([, description], index) => (
            <Box
              component="button"
              key={description}
              type="button"
              onClick={() => setActiveVideo(index)}
              aria-label={`Play video ${index + 1}: ${description}`}
              aria-current={index === activeVideo}
              sx={{
                width: index === activeVideo ? 42 : 12,
                height: 5,
                p: 0,
                border: 0,
                borderRadius: 5,
                bgcolor: index === activeVideo ? 'secondary.main' : 'rgba(255,255,255,.48)',
                cursor: 'pointer',
                transition: 'width 240ms ease, background-color 240ms ease',
              }}
            />
          ))}
        </Stack>

      </Container>
    </Box>

    <Container sx={{ py: { xs: 9, md: 13 } }}>
      <Reveal><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'end' }} spacing={3} mb={5}><Box><Typography color="secondary" fontWeight={900} letterSpacing=".12em" fontSize={12}>WHAT WE DO</Typography><Typography component="h2" variant="h2" sx={{ mt: 1, maxWidth: 650, fontSize: { xs: 38, md: 54 }, letterSpacing: '-.03em' }}>One company. More ways to move forward.</Typography></Box><Typography color="text.secondary" maxWidth={460} fontSize={18}>Choose the path that fits your goals today—and count on a team that understands where you want to go next.</Typography></Stack></Reveal>
      <Grid container spacing={3}>
        {services.map(([Icon, eyebrow, title, description, href, action], index) => {
          const external = href.startsWith('http')
          return <Grid size={{ xs: 12, md: 6 }} key={title}><Reveal delay={index * 70}><Paper sx={{ height: '100%', p: { xs: 3.5, md: 4.5 }, borderRadius: 4, border: 1, borderColor: 'divider', boxShadow: '0 14px 40px rgba(10,0,90,.06)', transition: 'transform 200ms ease, box-shadow 200ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 20px 50px rgba(10,0,90,.12)' } }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box sx={{ display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}><Icon sx={{ fontSize: 30 }} /></Box><Typography color="text.secondary" fontSize={11} fontWeight={900} letterSpacing=".12em" textTransform="uppercase">{eyebrow}</Typography></Stack><Typography component="h3" variant="h4" fontWeight={900} mt={4}>{title}</Typography><Typography color="text.secondary" mt={1.5} minHeight={{ md: 56 }}>{description}</Typography>{external ? <Button component="a" href={href} target="_blank" rel="noopener noreferrer" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 2.5, px: 0, '&:hover': { bgcolor: 'transparent', gap: .5 } }}>{action}</Button> : <Button component={RouterLink} to={href} endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 2.5, px: 0, '&:hover': { bgcolor: 'transparent', gap: .5 } }}>{action}</Button>}</Paper></Reveal></Grid>
        })}
      </Grid>
    </Container>

    <Box sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f6f7fb', py: { xs: 8, md: 11 } }}><Container><Grid container spacing={3}>{trustPoints.map(([title, description], index) => <Grid size={{ xs: 12, md: 4 }} key={title}><Stack direction="row" spacing={2.25}><Typography color="secondary" fontWeight={900} fontSize={14}>0{index + 1}</Typography><Box><Typography variant="h6" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1}>{description}</Typography></Box></Stack></Grid>)}</Grid></Container></Box>

    <Box sx={{ py: { xs: 9, md: 12 } }}><Container><Paper sx={{ overflow: 'hidden', borderRadius: 5, color: 'white', bgcolor: '#0A005A', p: { xs: 4, md: 7 } }}><Grid container spacing={4} alignItems="center"><Grid size={{ xs: 12, md: 8 }}><SupportAgentOutlinedIcon color="secondary" sx={{ fontSize: 46 }} /><Typography component="h2" variant="h3" mt={2} sx={{ fontSize: { xs: 34, md: 48 } }}>Not sure which path is right for you?</Typography><Typography mt={2} color="rgba(255,255,255,.75)" fontSize={18}>Tell us what you’re working toward. We’ll help you identify the best next step.</Typography></Grid><Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}><Button component={RouterLink} to="/consultants/" color="secondary" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />}>Book a consultation</Button></Grid></Grid></Paper></Container></Box>

    <Box id="freight-dispatch-masterclass">
      <DispatchMasterclass embedded />
    </Box>
  </>
}

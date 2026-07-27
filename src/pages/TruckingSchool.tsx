import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { Seo } from '../components/common/Seo'
import { Reveal } from '../components/common/Reveal'
import { TRUCKING_SCHOOL_URL } from '../config/links'
import { useContent } from '../contexts/ContentContext'

const trainingFocus = [
  [ShieldOutlinedIcon, 'Safety first', 'Develop the awareness and responsible habits expected of transportation professionals.'],
  [LocalShippingOutlinedIcon, 'Industry readiness', 'Understand the working environment, expectations, and daily realities of a trucking career.'],
  [RouteOutlinedIcon, 'Practical preparation', 'Build confidence through structured instruction focused on real driving and logistics situations.'],
  [FactCheckOutlinedIcon, 'Professional standards', 'Learn the communication, documentation, and decision-making habits that support long-term success.'],
] as const

const journey = [
  ['Discover', 'Explore the trucking career path and understand what professional training involves.'],
  ['Prepare', 'Build foundational knowledge, safety awareness, and the confidence to take your next step.'],
  ['Train', 'Continue to the dedicated school website for current programs, schedules, and enrollment details.'],
] as const

export default function TruckingSchool() {
  const { content } = useContent()
  const hero = content('iman-trucking-school', 'hero', {
    section_label: 'IMAN TRUCKING SCHOOL',
    title: 'Your road to a trucking career starts here.',
    body: 'Explore a clear path toward the trucking and logistics industry through focused education, practical preparation, and guidance built around your future.',
    button_text: 'Visit School Website',
    button_url: TRUCKING_SCHOOL_URL,
  })
  return <>
    <Seo title="Iman Trucking School | Career Training" canonical="/iman-trucking-school/" />

    <Box sx={{ position: 'relative', overflow: 'hidden', color: 'white', background: 'linear-gradient(120deg, #05002f 0%, #0A005A 52%, #1b1590 100%)', py: { xs: 9, md: 14 } }}>
      <Box sx={{ position: 'absolute', inset: 0, opacity: .09, backgroundImage: 'linear-gradient(115deg, transparent 48%, rgba(255,255,255,.35) 48%, rgba(255,255,255,.35) 49%, transparent 49%), linear-gradient(65deg, transparent 48%, rgba(255,255,255,.2) 48%, rgba(255,255,255,.2) 49%, transparent 49%)', backgroundSize: '120px 120px' }} />
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Reveal>
              <Chip label={hero.section_label} color="secondary" sx={{ mb: 3, fontWeight: 900, letterSpacing: '.09em' }} />
              <Typography component="h1" sx={{ maxWidth: 820, fontSize: { xs: 45, sm: 58, md: 74 }, lineHeight: 1.02, fontWeight: 900, letterSpacing: '-.045em' }}>
                {hero.title}
              </Typography>
              <Typography sx={{ maxWidth: 710, mt: 3, color: 'rgba(255,255,255,.8)', fontSize: { xs: 18, md: 21 }, lineHeight: 1.7 }}>
                {hero.body}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4}>
                <Button component="a" href={hero.button_url || TRUCKING_SCHOOL_URL} target="_blank" rel="noopener noreferrer" color="secondary" variant="contained" size="large" endIcon={<ArrowOutwardRoundedIcon />}>{hero.button_text}</Button>
                <Button href="#training" size="large" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.58)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.08)' } }}>Explore the training</Button>
              </Stack>
            </Reveal>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Reveal delay={100}>
              <Paper sx={{ p: { xs: 3.5, md: 5 }, borderRadius: 5, color: 'white', bgcolor: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(14px)' }}>
                <SchoolOutlinedIcon color="secondary" sx={{ fontSize: 58 }} />
                <Typography variant="h4" fontWeight={900} mt={2}>Learn with purpose</Typography>
                <Typography color="rgba(255,255,255,.74)" mt={1.5}>Training should do more than explain the road. It should prepare you to approach a transportation career with skill, responsibility, and confidence.</Typography>
                <Stack spacing={1.25} mt={3}>
                  {['Structured learning path', 'Career-focused preparation', 'Support for your next step'].map(item => <Typography key={item} fontWeight={700}>✓&nbsp;&nbsp;{item}</Typography>)}
                </Stack>
              </Paper>
            </Reveal>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Container id="training" sx={{ py: { xs: 9, md: 12 }, scrollMarginTop: 120 }}>
      <Reveal>
        <Typography color="secondary" textAlign="center" fontSize={12} fontWeight={900} letterSpacing=".14em">TRAIN FOR THE ROAD AHEAD</Typography>
        <Typography component="h2" variant="h2" textAlign="center" sx={{ mt: 1.5, mx: 'auto', maxWidth: 760, fontSize: { xs: 37, md: 52 }, letterSpacing: '-.03em' }}>Build a strong professional foundation.</Typography>
        <Typography color="text.secondary" textAlign="center" mx="auto" maxWidth={720} fontSize={18} mt={2}>Our overview introduces the areas that matter when preparing for a responsible, opportunity-driven career in trucking.</Typography>
      </Reveal>
      <Grid container spacing={3} mt={4}>
        {trainingFocus.map(([Icon, title, description], index) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={title}><Reveal delay={index * 70}><Paper sx={{ height: '100%', p: 3.5, borderRadius: 4, border: 1, borderColor: 'divider', boxShadow: '0 14px 40px rgba(10,0,90,.06)' }}><Box sx={{ display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}><Icon sx={{ fontSize: 30 }} /></Box><Typography variant="h5" fontWeight={900} mt={3}>{title}</Typography><Typography color="text.secondary" mt={1.25}>{description}</Typography></Paper></Reveal></Grid>)}
      </Grid>
    </Container>

    <Box sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f6f7fb', py: { xs: 9, md: 12 } }}>
      <Container>
        <Grid container spacing={{ xs: 6, md: 9 }} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Reveal>
              <Typography color="secondary" fontSize={12} fontWeight={900} letterSpacing=".14em">YOUR NEXT MILESTONE</Typography>
              <Typography component="h2" variant="h2" sx={{ mt: 1.5, fontSize: { xs: 38, md: 52 }, letterSpacing: '-.03em' }}>A simple path from interest to action.</Typography>
              <Typography color="text.secondary" fontSize={18} mt={2}>Start with this overview, then continue to the dedicated school website for the latest program and enrollment information.</Typography>
            </Reveal>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2}>
              {journey.map(([title, description], index) => <Reveal delay={index * 70} key={title}><Paper sx={{ p: 3, borderRadius: 4, border: 1, borderColor: 'divider' }}><Stack direction="row" spacing={2.5} alignItems="flex-start"><Typography sx={{ display: 'grid', flexShrink: 0, placeItems: 'center', width: 42, height: 42, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 900 }}>{index + 1}</Typography><Box><Typography variant="h6" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={.5}>{description}</Typography></Box></Stack></Paper></Reveal>)}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ py: { xs: 8, md: 10 } }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 5, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <SupportAgentOutlinedIcon color="secondary" sx={{ fontSize: 50 }} />
          <Typography component="h2" variant="h3" mt={2}>Ready to explore trucking school?</Typography>
          <Typography color="rgba(255,255,255,.76)" fontSize={18} mt={1.5}>Visit the dedicated Iman Trucking School website for current training options, schedules, requirements, and enrollment information.</Typography>
          <Button component="a" href={TRUCKING_SCHOOL_URL} target="_blank" rel="noopener noreferrer" color="secondary" variant="contained" size="large" endIcon={<ArrowOutwardRoundedIcon />} sx={{ mt: 3 }}>Visit School Website</Button>
        </Paper>
      </Container>
    </Box>
  </>
}

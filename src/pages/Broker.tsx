import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { Seo } from '../components/common/Seo'
import { Reveal } from '../components/common/Reveal'
import { FREIGHT_BROKER_URL } from '../config/links'
import { useContent } from '../contexts/ContentContext'

const outcomes = [
  [BusinessCenterOutlinedIcon, 'Brokerage foundations', 'Understand the broker’s role, industry structure, and the steps involved in starting professionally.'],
  [RouteOutlinedIcon, 'Move freight confidently', 'Learn the workflow behind matching shippers and carriers, from initial quote through delivery.'],
  [HandshakeOutlinedIcon, 'Build strong relationships', 'Develop clear communication and relationship-building skills for carriers, shippers, and partners.'],
  [QueryStatsOutlinedIcon, 'Grow strategically', 'Explore pricing, negotiation, operations, and systems that support a scalable brokerage business.'],
] as const

const curriculum = [
  'How freight brokerage works from end to end',
  'Broker authority, compliance, and essential setup',
  'Finding and communicating with shippers',
  'Carrier sourcing and qualification',
  'Pricing loads and negotiating rates',
  'Managing documentation and daily operations',
] as const

export default function Broker() {
  const { content } = useContent()
  const hero = content('freight-broker-masterclass', 'hero', {
    section_label: 'FREIGHT BROKER MASTERCLASS',
    title: 'Build the skills to connect freight with opportunity.',
    body: 'A step-by-step introduction to freight brokerage for aspiring professionals ready to understand the industry, develop practical skills, and build a clear path forward.',
    button_text: 'Visit Masterclass Website',
    button_url: FREIGHT_BROKER_URL,
  })
  return <>
    <Seo title="Freight Broker Masterclass - Iman Logistics" canonical="/freight-broker-masterclass/" />

    <Box sx={{ position: 'relative', overflow: 'hidden', color: 'white', background: 'linear-gradient(125deg, #05002f 0%, #0A005A 55%, #2416a8 100%)', py: { xs: 9, md: 14 }, '&::after': { content: '""', position: 'absolute', width: 520, height: 520, right: -160, top: -250, borderRadius: '50%', border: '90px solid rgba(255,255,255,.04)' } }}>
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Reveal>
              <Chip label={hero.section_label} color="secondary" sx={{ mb: 3, fontWeight: 900, letterSpacing: '.08em' }} />
              <Typography component="h1" sx={{ maxWidth: 820, fontSize: { xs: 44, sm: 58, md: 72 }, lineHeight: 1.02, fontWeight: 900, letterSpacing: '-.045em' }}>
                {hero.title}
              </Typography>
              <Typography sx={{ maxWidth: 720, mt: 3, color: 'rgba(255,255,255,.8)', fontSize: { xs: 18, md: 21 }, lineHeight: 1.7 }}>
                {hero.body}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4}>
                <Button component="a" href={FREIGHT_BROKER_URL} target="_blank" rel="noopener noreferrer" color="secondary" variant="contained" size="large" endIcon={<ArrowOutwardRoundedIcon />}>
                  {hero.button_text}
                </Button>
                <Button href="#curriculum" size="large" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.55)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.08)' } }}>
                  View what you’ll learn
                </Button>
              </Stack>
            </Reveal>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Reveal delay={100}>
              <Paper sx={{ p: { xs: 3.5, md: 5 }, borderRadius: 5, color: 'white', bgcolor: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(14px)' }}>
                <VerifiedOutlinedIcon color="secondary" sx={{ fontSize: 48 }} />
                <Typography variant="h4" fontWeight={900} mt={2}>Designed for beginners</Typography>
                <Typography color="rgba(255,255,255,.74)" mt={1.5}>No previous freight brokerage experience is required. Start with the fundamentals and progress through practical business concepts.</Typography>
                <Stack spacing={1.25} mt={3}>
                  {['Clear, structured lessons', 'Industry-focused knowledge', 'Flexible online learning'].map(item => <Typography key={item} fontWeight={700}>✓&nbsp;&nbsp;{item}</Typography>)}
                </Stack>
              </Paper>
            </Reveal>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 9, md: 12 } }}>
      <Reveal>
        <Typography color="secondary" textAlign="center" fontSize={12} fontWeight={900} letterSpacing=".14em">YOUR BROKERAGE FOUNDATION</Typography>
        <Typography component="h2" variant="h2" textAlign="center" sx={{ mt: 1.5, mx: 'auto', maxWidth: 760, fontSize: { xs: 36, md: 52 }, letterSpacing: '-.03em' }}>Learn the business from every angle.</Typography>
        <Typography color="text.secondary" textAlign="center" mx="auto" maxWidth={700} fontSize={18} mt={2}>Build a working understanding of the people, processes, and decisions behind successful freight movement.</Typography>
      </Reveal>
      <Grid container spacing={3} mt={4}>
        {outcomes.map(([Icon, title, description], index) => <Grid size={{ xs: 12, sm: 6 }} key={title}><Reveal delay={index * 70}><Paper sx={{ height: '100%', p: 4, borderRadius: 4, border: 1, borderColor: 'divider', boxShadow: '0 14px 40px rgba(10,0,90,.06)' }}><Box sx={{ display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}><Icon sx={{ fontSize: 30 }} /></Box><Typography variant="h5" fontWeight={900} mt={3}>{title}</Typography><Typography color="text.secondary" mt={1.25}>{description}</Typography></Paper></Reveal></Grid>)}
      </Grid>
    </Container>

    <Box id="curriculum" sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f6f7fb', py: { xs: 9, md: 12 }, scrollMarginTop: 120 }}>
      <Container>
        <Grid container spacing={{ xs: 6, md: 9 }} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Reveal>
              <Typography color="secondary" fontSize={12} fontWeight={900} letterSpacing=".14em">WHAT YOU’LL LEARN</Typography>
              <Typography component="h2" variant="h2" sx={{ mt: 1.5, fontSize: { xs: 38, md: 52 }, letterSpacing: '-.03em' }}>A practical roadmap for freight brokerage.</Typography>
              <Typography color="text.secondary" fontSize={18} mt={2}>Review the program here, then continue to the dedicated masterclass website for enrollment details and full access.</Typography>
            </Reveal>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Reveal delay={100}>
              <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}>
                <Stack spacing={0}>
                  {curriculum.map((item, index) => <Stack key={item} direction="row" spacing={2} alignItems="center" sx={{ py: 2, borderBottom: index === curriculum.length - 1 ? 0 : 1, borderColor: 'divider' }}><Typography color="secondary" fontWeight={900} fontSize={13}>{String(index + 1).padStart(2, '0')}</Typography><Typography fontWeight={700}>{item}</Typography></Stack>)}
                </Stack>
              </Paper>
            </Reveal>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ py: { xs: 8, md: 10 } }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 5, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <SupportAgentOutlinedIcon color="secondary" sx={{ fontSize: 50 }} />
          <Typography component="h2" variant="h3" mt={2}>Ready to explore freight brokerage?</Typography>
          <Typography color="rgba(255,255,255,.76)" fontSize={18} mt={1.5}>Continue to the dedicated Freight Broker Masterclass website for program access and enrollment information.</Typography>
          <Button component="a" href={FREIGHT_BROKER_URL} target="_blank" rel="noopener noreferrer" color="secondary" variant="contained" size="large" endIcon={<ArrowOutwardRoundedIcon />} sx={{ mt: 3 }}>
            Visit Masterclass Website
          </Button>
        </Paper>
      </Container>
    </Box>
  </>
}

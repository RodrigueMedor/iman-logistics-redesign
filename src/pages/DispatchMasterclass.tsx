import { Box, Container, Grid, Stack, Typography } from '@mui/material'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import { Seo } from '../components/common/Seo'
import { BuyButton } from '../components/common/BuyButton'
import { RotatingHeroOrbit } from '../components/home/RotatingHeroOrbit'
import hero from '../assets/images/SDFERGGF-scaled.png'
import portrait from '../assets/images/POLO234-scaled.png'
import map from '../assets/images/mapusa-2048x1269.png'
import testimonial from '../assets/images/dgd.png'
import module1 from '../assets/images/1.png'
import module2 from '../assets/images/2.png'
import module3 from '../assets/images/3.png'
import module4 from '../assets/images/4.png'
import module5 from '../assets/images/5.png'

const benefits = [
  ['Master Your Earning Potential', 'Take command of your career. Your input, your schedule, and your success should directly benefit only you.'],
  ['Go all-in on your dream.', 'Tired of enriching others? Your energy is worth more. See how leveraging a six-figure income lets you finally benefit directly'],
  ['Elevate your quality of life', 'Want more time with your family and friends? Stop wishing for a life you can enjoy; this is your moment to claim it.'],
  ['Your office is the world', 'You can enjoy total location freedom, managing loads and working from anywhere as a dispatcher'],
]
const learning = [
  'How the freight dispatch industry works',
  'The role and responsibilities of a dispatcher',
  'How to find and work with carriers',
  'Rate negotiation strategies with brokers',
  'Dispatch workflows, paperwork, and compliance basics',
  'How to communicate professionally with drivers and brokers',
  'How to scale and manage multiple trucks',
]
const modules = [
  [module1, 'Begin Dispatching Right Away', 'Learn how to implement the system that ensures your dispatching business runs flawlessly. The curriculum includes: What a Dispatcher Does, Immediate Startup Strategies, Core Daily Responsibilities, Building Driver Trust, Networking Secrets, and more powerful insights'],
  [module2, 'Load Board Strategies', 'You will master everything from understanding what load boards are to expertly obtaining and booking freight, negotiating top rates, and building lasting relationships with key Shippers and Brokers.'],
  [module3, 'Managing Day-to-Day Operations', 'This module provides the comprehensive, A-to-Z steps of the entire dispatching process, ensuring you miss nothing. Topics covered include: Driver confirmation, ELD verification, seamless load booking, confirming competitive rates, expert broker communication'],
  [module4, 'Controlling Your Dispatching Finances', 'The contrast between struggling to survive and generating massive profits in trucking is stark. It’s not about effort it’s about having the right system. We reveal the advanced, strategic methodologies you need to maximize every financial metric.'],
  [module5, 'Building Your Dispatching Team', 'Ready to start a dispatch service where loads are booked by OTHERS? This Masterclass shows you how to establish that system and create passive income! I reveal the massive benefits of ownership, teach advanced methods for finding smarter loads, and give you the duplication blueprint to step back and become a true'],
]
const sectionHeading = { fontSize: { xs: 34, md: 52 }, color: 'primary.main', textAlign: 'center', mb: 5 }

export default function DispatchMasterclass({ embedded = false }: { embedded?: boolean }) {
  return <>
    {!embedded && <Seo title="Freight Dispatch Masterclass - Iman Logistics" canonical="/freight-dispatch-masterclass/" />}
    <Box sx={{ bgcolor: '#0A005A', color: 'white', py: { xs: 7, md: 10 } }}>
      <Container>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 42, md: 65 }, mb: 3 }}>Become a Freight Dispatcher</Typography>
            <Typography fontSize={{ xs: 18, md: 21 }} mb={4}>The <strong>Freight Dispatch Masterclass</strong> is a step-by-step training designed to teach you how to become a professional freight dispatcher from scratch. Explore the program overview here, then continue to our dedicated masterclass website when you’re ready to enroll.</Typography>
            <BuyButton />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><RotatingHeroOrbit><VideoPoster src={hero} alt="Freight Dispatch Masterclass" /></RotatingHeroOrbit></Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container>
        <Typography component="h2" variant="h2" sx={sectionHeading}>Why Dispatch Training is the Best Choice</Typography>
        <Grid container spacing={4}>
          {benefits.map(([title, text]) => <Grid size={{ xs: 12, sm: 6 }} key={title}><Box sx={{ p: 4, height: '100%', border: 1, borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 5px 18px rgba(0,0,0,.08)' }}><Typography variant="h3" color="primary" fontSize={28} mb={2}>{title}</Typography><Typography fontSize={18}>{text}</Typography></Box></Grid>)}
        </Grid>
      </Container>
    </Box>

    <Box sx={{ bgcolor: '#0A005A', color: 'white', py: { xs: 8, md: 11 } }}>
      <Container>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography component="h2" variant="h2" sx={{ fontSize: { xs: 36, md: 52 }, mb: 3 }}>Unlocking High-Earning Potential as a Freight Dispatcher.</Typography>
            <Stack spacing={1.5} fontSize={19}>
              <Typography>Expect a single truck to pull in about $6,500 in gross revenue each week.</Typography>
              <Typography>Your potential gross earning from that truck is up to $650 weekly.</Typography>
              <Typography>Scale that up: Two trucks mean your weekly gross earnings climb to $1,300$…..</Typography>
              <Typography>Four trucks instantly equals 2,600$ gross per week…</Typography>
              <Typography>Six trucks brings your gross weekly earnings up to an impressive 3,900$…</Typography>
              <Typography>This is more than math; this is your proven reality. You are seeing the exact blueprint dispatchers use annually to break the six-figure barrier and claim complete control over their lives.</Typography>
            </Stack>
            <Box mt={4}><BuyButton /></Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><Box component="img" loading="lazy" src={map} alt="Map of the United States" sx={{ width: '100%' }} /></Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container>
        <Typography component="h2" variant="h2" sx={sectionHeading}>Dispatching provides a viable path to self-employment and control</Typography>
        <Typography variant="h3" textAlign="center" color="secondary" mb={7} fontSize={{ xs: 24, md: 35 }}>( You don't need trucking background to start )</Typography>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}><Box component="img" loading="lazy" src={portrait} alt="Freight dispatch instructor" sx={{ width: '100%', maxHeight: 650, objectFit: 'contain' }} /></Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography component="h2" variant="h2" color="primary" fontSize={{ xs: 36, md: 52 }} mb={3}>What You’ll Learn</Typography>
            <Stack component="ul" spacing={2} sx={{ pl: 3 }}>{learning.map(item => <Typography component="li" fontSize={20} key={item}>{item}</Typography>)}</Stack>
            <Box mt={4}><BuyButton /></Box>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f6f6f6', py: { xs: 8, md: 12 } }}>
      <Container>
        <Typography component="h2" variant="h2" sx={sectionHeading}>Your Step-by-Step Training Guide</Typography>
        <Stack spacing={5}>
          {modules.map(([image, title, text], i) => <Grid container spacing={5} alignItems="center" direction={{ xs: 'column', md: i % 2 ? 'row-reverse' : 'row' }} key={title}>
            <Grid size={{ xs: 12, md: 5 }}><Box component="img" loading="lazy" src={image} alt="" sx={{ width: '100%' }} /></Grid>
            <Grid size={{ xs: 12, md: 7 }}><Typography component="h3" variant="h3" color="primary" fontSize={30} mb={2}>{title}</Typography><Typography fontSize={18}>{text}</Typography></Grid>
          </Grid>)}
        </Stack>
      </Container>
    </Box>

    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container>
        <Typography component="h2" variant="h2" sx={sectionHeading}>.....Client success stories arrive in our inbox every single day</Typography>
        <Grid container spacing={3}>{[1,2,3,4].map(n => <Grid size={{ xs: 12, sm: 6 }} key={n}><VideoPoster src={testimonial} alt={`Client success story ${n}`} /></Grid>)}</Grid>
      </Container>
    </Box>
    <Box sx={{ bgcolor: '#0A005A', color: 'white', py: { xs: 8, md: 11 }, textAlign: 'center' }}>
      <Container maxWidth="md">
        <Typography component="h2" variant="h2" fontSize={{ xs: 36, md: 52 }} mb={3}>Success belongs to those who possess the right information and are prepared to execute</Typography>
        <Typography component="h2" variant="h3" fontSize={{ xs: 24, md: 35 }} mb={4}>Stop waiting. Hit the button below to secure your spot instantly.</Typography>
        <BuyButton />
      </Container>
    </Box>
  </>
}

function VideoPoster({ src, alt }: { src: string; alt: string }) {
  return <Box role="button" tabIndex={0} aria-label={`Play video: ${alt}`} sx={{ position: 'relative', lineHeight: 0, overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.02)' } }}>
    <Box component="img" loading="lazy" src={src} alt={alt} sx={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', transition: 'transform .25s' }} />
    <PlayCircleOutlineIcon sx={{ position: 'absolute', inset: 0, m: 'auto', color: 'white', fontSize: 76, filter: 'drop-shadow(0 2px 4px #000)' }} />
  </Box>
}

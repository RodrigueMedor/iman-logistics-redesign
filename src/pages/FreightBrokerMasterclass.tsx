import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import GavelRoundedIcon from '@mui/icons-material/GavelRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded'
import { Seo } from '../components/common/Seo'
import { BuyButton } from '../components/common/BuyButton'
import { useContent } from '../contexts/ContentContext'
import { FreightBrokerRegistration } from '../features/freightBroker/FreightBrokerRegistration'
import { MASTERCLASS_PROGRAMS } from '../features/freightBroker/program'

// Freight Broker Master Class: program overview plus the shared masterclass
// registration (verified email/phone → signed policy → Stripe Checkout).
// Headline copy is editable in the content CMS under "Freight Broker Master Class".

const program = MASTERCLASS_PROGRAMS.broker_masterclass
const CMS_PAGE = 'freight-broker-master-class'
const logo = '/images/freight-broker-master-class.jpg'
const navy = '#010081'

const learning = [
  'How freight brokerage works: the roles of shippers, brokers, and carriers',
  'Getting your broker authority: USDOT and MC numbers, the BOC-3, and the BMC-84 surety bond',
  'Finding shippers and building a customer base',
  'Vetting and onboarding carriers: authority, insurance, and safety checks',
  'Pricing loads, negotiating rates, and protecting your margin',
  'Rate confirmations, broker-carrier agreements, and shipper contracts',
  'Load boards, tracking, and day-to-day load management',
  'Invoicing, credit checks, payment terms, and getting paid',
]

const modules = [
  ['Brokerage foundations', 'Understand where a freight broker fits in the supply chain, how a brokerage makes money, and what separates a broker from a dispatcher or a carrier.'],
  ['Authority, bonding, and compliance', 'Walk through registering your brokerage with the FMCSA, the financial-security and process-agent requirements, and the records a broker is expected to keep.'],
  ['Shippers and sales', 'Learn how to identify shippers, present your services, quote a lane, and turn one-time loads into repeat customers.'],
  ['Carriers and operations', 'Build a reliable carrier network, check every carrier before tendering a load, and manage loads from booking through delivery.'],
  ['Money and growth', 'Price freight with confidence, manage cash flow between shipper and carrier payments, and put systems in place to grow your brokerage.'],
] as const

const highlights = [
  [SchoolRoundedIcon, '5 modules', 'From foundations to growing your brokerage'],
  [GavelRoundedIcon, 'Authority & compliance', 'USDOT, MC, BOC-3 and the BMC-84 bond'],
  [EventAvailableRoundedIcon, 'Scheduled sessions', 'Pick the start date that fits you'],
  [LockRoundedIcon, 'Secure enrollment', 'Register online and pay with Stripe'],
] as const

const sectionHeading = { fontSize: { xs: 34, md: 52 }, color: 'primary.main', textAlign: 'center', mb: 5 }

export default function FreightBrokerMasterclass() {
  const { content } = useContent()
  const hero = content(CMS_PAGE, 'hero', {
    section_label: 'CAREER TRAINING',
    title: program.name,
    body: 'A step-by-step program that teaches you how to start and run a freight brokerage: getting your authority, finding shippers, working with carriers, and pricing freight. Choose an upcoming session below, register, and pay securely online.',
    button_text: 'Register now',
  })
  const learnSection = content(CMS_PAGE, 'curriculum', {
    section_label: 'WHAT YOU’LL LEARN',
    title: 'What You’ll Learn',
    body: 'Everything you need to understand the brokerage business and move your first loads with confidence.',
  })
  const modulesSection = content(CMS_PAGE, 'modules', {
    section_label: 'PROGRAM MODULES',
    title: 'Your Step-by-Step Brokerage Roadmap',
    body: '',
  })

  return <>
    <Seo title={`${program.name} - Iman Logistics`} canonical={program.path} />
    <Box sx={{ bgcolor: navy, color: 'white', pt: { xs: 7, md: 10 }, pb: { xs: 10, md: 13 }, background: `radial-gradient(1200px 500px at 85% 20%, rgba(255,255,255,.08), transparent 60%), ${navy}` }}>
      <Container>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ color: '#ff5a5f', fontWeight: 900, letterSpacing: '.12em', mb: 1.5 }}>{hero.section_label}</Typography>
            <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 42, md: 65 }, mb: 3 }}>{hero.title}</Typography>
            <Typography fontSize={{ xs: 18, md: 21 }} mb={4}>{hero.body}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <BuyButton to={`${program.path}#register`} label={hero.button_text || 'Register now'} />
              <Button href="#curriculum" variant="outlined" size="large" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.08)' } }}>See the curriculum</Button>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box component="img" src={logo} alt="Iman Logistics Freight Broker Master Class" sx={{ width: '100%', maxWidth: 480, mx: 'auto', display: 'block', borderRadius: 4, border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 30px 80px rgba(0,0,20,.45)' }} />
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ display: 'flow-root', bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f5f7fb' }}>
    <Container sx={{ mt: { xs: -6, md: -7 }, position: 'relative', zIndex: 1 }}>
      <Grid container sx={{ bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0 18px 50px rgba(1,0,129,.12)', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        {highlights.map(([Icon, title, text], index) => <Grid size={{ xs: 12, sm: 6, md: 3 }} key={title} sx={theme => { const line = `1px solid ${theme.palette.divider}`; return { p: { xs: 2.5, md: 3 }, borderLeft: { xs: 0, sm: index % 2 ? line : 0, md: index ? line : 0 }, borderTop: { xs: index ? line : 0, sm: index > 1 ? line : 0, md: 0 } } }}>
          <Stack direction="row" gap={1.75} alignItems="flex-start">
            <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(227,6,19,.08)', color: 'secondary.main', flexShrink: 0 }}><Icon /></Box>
            <Box><Typography fontWeight={900} color="primary">{title}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box>
          </Stack>
        </Grid>)}
      </Grid>
    </Container>
    </Box>

    <Box id="register" component="section" aria-label={`${program.name} registration`} sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 6, md: 8 }, scrollMarginTop: 110, bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f5f7fb' }}>
      <Container maxWidth="lg">
        <FreightBrokerRegistration program={program.id} />
      </Container>
    </Box>

    <Box id="curriculum" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 110 }}>
      <Container>
        <Typography sx={{ color: 'secondary.main', fontWeight: 900, letterSpacing: '.12em', textAlign: 'center', mb: 1 }}>{learnSection.section_label}</Typography>
        <Typography component="h2" variant="h2" sx={sectionHeading}>{learnSection.title}</Typography>
        {learnSection.body && <Typography textAlign="center" fontSize={20} color="text.secondary" sx={{ maxWidth: 760, mx: 'auto', mt: -2, mb: 5 }}>{learnSection.body}</Typography>}
        <Grid container spacing={2.5}>
          {learning.map(item => <Grid size={{ xs: 12, md: 6 }} key={item}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 2.5, height: '100%', border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
              <CheckCircleRoundedIcon color="secondary" sx={{ mt: '2px' }} />
              <Typography fontSize={18}>{item}</Typography>
            </Stack>
          </Grid>)}
        </Grid>
      </Container>
    </Box>

    <Box sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f6f6f6', py: { xs: 8, md: 12 } }}>
      <Container>
        <Typography sx={{ color: 'secondary.main', fontWeight: 900, letterSpacing: '.12em', textAlign: 'center', mb: 1 }}>{modulesSection.section_label}</Typography>
        <Typography component="h2" variant="h2" sx={sectionHeading}>{modulesSection.title}</Typography>
        <Grid container spacing={3}>
          {modules.map(([title, text], index) => <Grid size={{ xs: 12, sm: 6, md: index < 2 ? 6 : 4 }} key={title}>
            <Box sx={{ p: 4, height: '100%', bgcolor: 'background.paper', borderRadius: 3, borderTop: '5px solid', borderColor: 'secondary.main', boxShadow: '0 5px 18px rgba(0,0,0,.08)' }}>
              <Typography sx={{ color: 'secondary.main', fontWeight: 900, mb: 1 }}>Module {index + 1}</Typography>
              <Typography component="h3" variant="h3" color="primary" fontSize={26} mb={1.5}>{title}</Typography>
              <Typography fontSize={17}>{text}</Typography>
            </Box>
          </Grid>)}
        </Grid>
      </Container>
    </Box>

    <Box sx={{ bgcolor: navy, color: 'white', py: { xs: 7, md: 9 }, textAlign: 'center' }}>
      <Container maxWidth="md">
        <Typography component="h2" variant="h2" sx={{ fontSize: { xs: 32, md: 46 }, mb: 2 }}>Ready to start your brokerage?</Typography>
        <Typography fontSize={19} mb={4}>Seats are confirmed once your registration is paid. Payments are processed securely by Stripe.</Typography>
        <Button href="#register" variant="contained" color="secondary" size="large" sx={{ minWidth: 220, fontSize: 17 }}>Reserve your seat</Button>
      </Container>
    </Box>
  </>
}

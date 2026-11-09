import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
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
    <Box sx={{ bgcolor: navy, color: 'white', py: { xs: 7, md: 10 } }}>
      <Container>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ color: '#ff5a5f', fontWeight: 900, letterSpacing: '.12em', mb: 1.5 }}>{hero.section_label}</Typography>
            <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 42, md: 65 }, mb: 3 }}>{hero.title}</Typography>
            <Typography fontSize={{ xs: 18, md: 21 }} mb={4}>{hero.body}</Typography>
            <BuyButton to={`${program.path}#register`} label={hero.button_text || 'Register now'} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box component="img" src={logo} alt="Iman Logistics Freight Broker Master Class" sx={{ width: '100%', maxWidth: 520, mx: 'auto', display: 'block', borderRadius: 4, boxShadow: '0 25px 60px rgba(0,0,0,.35)' }} />
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Box id="register" component="section" aria-label={`${program.name} registration`} sx={{ py: { xs: 5, md: 7 }, scrollMarginTop: 110, bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f5f7fb' }}>
      <Container maxWidth="lg">
        <FreightBrokerRegistration program={program.id} />
      </Container>
    </Box>

    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container>
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

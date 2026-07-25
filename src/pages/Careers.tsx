import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'

const benefits = [
  { icon: <GroupsOutlinedIcon />, title: 'People-first culture', copy: 'Join a team that values clear communication, accountability, and respect across every role.' },
  { icon: <PaymentsOutlinedIcon />, title: 'Competitive opportunity', copy: 'Build a rewarding career with role-based compensation and room to grow with the operation.' },
  { icon: <SchoolOutlinedIcon />, title: 'Practical development', copy: 'Strengthen your skills through real-world coaching, operational support, and continued learning.' },
]

const positions = [
  {
    title: 'CDL Class-A Driver',
    department: 'Fleet Operations',
    location: 'Regional opportunities',
    type: 'Full-time',
    intro: 'We are interested in safety-minded CDL Class-A drivers who communicate well, protect customer freight, and take pride in professional service.',
    responsibilities: [
      'Safely operate and care for assigned tractor-trailer equipment',
      'Complete pre-trip and post-trip inspections',
      'Maintain accurate activity, delivery, and compliance records',
      'Communicate delays, incidents, and delivery updates promptly',
      'Represent Iman Logistics professionally with customers and partners',
    ],
    qualifications: [
      'Valid Class-A commercial driver’s license',
      'Safe driving history and current medical certification',
      'Ability to follow dispatch instructions and delivery requirements',
      'Dependable communication and a strong work ethic',
      'Relevant recent commercial driving experience',
    ],
  },
  {
    title: 'Freight Dispatcher / Load Coordinator',
    department: 'Logistics Operations',
    location: 'Office or remote, based on role',
    type: 'Full-time',
    intro: 'We are looking for an organized dispatcher who can coordinate freight, support drivers, and keep customers informed from pickup through delivery.',
    responsibilities: [
      'Locate, negotiate, and coordinate suitable freight opportunities',
      'Communicate load details and schedule changes to drivers',
      'Maintain accurate shipment records and operational documents',
      'Coordinate with brokers, shippers, receivers, and carriers',
      'Monitor delivery progress and collect proof-of-delivery documents',
    ],
    qualifications: [
      'Freight dispatch, logistics, or transportation experience',
      'Strong written, phone, and customer-service communication',
      'Comfort working with transportation systems and spreadsheets',
      'Detail-oriented approach to deadlines and documentation',
      'Independent judgment with a collaborative attitude',
    ],
  },
  {
    title: 'Freight Broker / Account Executive',
    department: 'Brokerage',
    location: 'Hybrid or remote, based on role',
    type: 'Full-time',
    intro: 'Help customers move freight efficiently by developing trusted relationships, sourcing capacity, and managing shipments from quote through delivery.',
    responsibilities: [
      'Develop and maintain shipper and carrier relationships',
      'Prepare competitive freight quotes and negotiate rates',
      'Match customer shipments with qualified carrier capacity',
      'Monitor active loads and communicate service updates',
      'Maintain accurate customer, carrier, and margin records',
    ],
    qualifications: [
      'Transportation sales, freight brokerage, or logistics experience',
      'Confident negotiation and relationship-building skills',
      'Strong follow-through in a deadline-driven environment',
      'Comfort using transportation and customer-management systems',
      'Professional written and verbal communication',
    ],
  },
  {
    title: 'Safety & Compliance Coordinator',
    department: 'Safety',
    location: 'Office or hybrid',
    type: 'Full-time',
    intro: 'Support a safe, compliant fleet by maintaining driver records, monitoring requirements, and helping the team follow transportation safety standards.',
    responsibilities: [
      'Maintain driver qualification and compliance records',
      'Track license, medical-card, permit, and training expirations',
      'Support incident documentation and corrective-action follow-up',
      'Coordinate safety communications and recurring training',
      'Assist with audits and regulatory documentation',
    ],
    qualifications: [
      'Experience in transportation safety, compliance, or administration',
      'Working knowledge of commercial fleet documentation',
      'Excellent organization and confidential record handling',
      'Ability to communicate policies clearly and respectfully',
      'Consistent attention to detail and deadlines',
    ],
  },
  {
    title: 'Shipment Tracking Specialist',
    department: 'Customer Operations',
    location: 'Office or remote, based on role',
    type: 'Full-time',
    intro: 'Keep customers informed and shipments visible by monitoring freight milestones, resolving exceptions, and providing accurate service updates.',
    responsibilities: [
      'Track pickups, in-transit milestones, and deliveries',
      'Contact drivers and carriers for timely location updates',
      'Communicate delays and revised arrival estimates',
      'Document shipment events and customer conversations',
      'Escalate service exceptions to the appropriate operations team',
    ],
    qualifications: [
      'Customer service, dispatch, or logistics coordination experience',
      'Clear and professional phone and email communication',
      'Ability to manage multiple active shipments at once',
      'Strong problem-solving and escalation judgment',
      'Comfort working across tracking portals and spreadsheets',
    ],
  },
  {
    title: 'Billing & Documentation Specialist',
    department: 'Finance Operations',
    location: 'Office or hybrid',
    type: 'Full-time',
    intro: 'Support accurate and timely billing by reviewing shipment documents, resolving discrepancies, and keeping financial records organized.',
    responsibilities: [
      'Review rate confirmations, bills of lading, and delivery documents',
      'Prepare customer invoices and carrier payment files',
      'Identify missing documents and follow up with operations',
      'Research billing discrepancies and accessorial charges',
      'Maintain accurate digital records and status reports',
    ],
    qualifications: [
      'Billing, bookkeeping, or transportation-documentation experience',
      'High accuracy with numbers, records, and data entry',
      'Working knowledge of spreadsheets and office software',
      'Ability to prioritize time-sensitive documentation',
      'Professional communication with customers and carriers',
    ],
  },
]

export default function Careers() {
  return <>
    <Seo title="Careers | Iman Logistics" canonical="/careers/" />
    <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#071a33', color: 'white', py: { xs: 9, md: 14 } }}>
      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 82% 24%, rgba(224,0,0,.28), transparent 31%), radial-gradient(circle at 10% 100%, rgba(80,93,222,.36), transparent 38%)' }} />
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={5} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Chip label="BUILD YOUR CAREER WITH US" color="secondary" sx={{ mb: 3, fontWeight: 900 }} />
            <Typography component="h1" sx={{ fontSize: { xs: 48, md: 76 }, lineHeight: .98, fontWeight: 950, letterSpacing: '-.045em', maxWidth: 820 }}>Move freight.<br />Build what’s next.</Typography>
            <Typography sx={{ maxWidth: 700, mt: 3, fontSize: { xs: 18, md: 21 }, color: 'rgba(255,255,255,.74)', lineHeight: 1.7 }}>Join a logistics team committed to safe transportation, dependable service, and meaningful opportunities for people ready to grow.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={4} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button href="#open-positions" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardRoundedIcon />}>View open positions</Button>
              <Button component={RouterLink} to="/contact-us/" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.46)' }}>Contact recruiting</Button>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3.5, borderRadius: 5, bgcolor: 'rgba(255,255,255,.09)', color: 'white', border: '1px solid rgba(255,255,255,.16)', backdropFilter: 'blur(12px)' }}>
              <LocalShippingOutlinedIcon sx={{ fontSize: 44, color: '#f2ca67' }} />
              <Typography variant="h5" fontWeight={900} mt={2}>Different roles. One mission.</Typography>
              <Typography color="rgba(255,255,255,.7)" mt={1.5}>Drivers, dispatchers, coordinators, and support professionals work together to keep every commitment moving.</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 7, md: 10 } }}>
      <Box textAlign="center" maxWidth={720} mx="auto" mb={5}><Typography color="secondary.main" fontWeight={900} letterSpacing={1.4} fontSize={13}>WHY IMAN LOGISTICS</Typography><Typography variant="h3" mt={1.5} fontWeight={950}>A workplace built around progress</Typography><Typography color="text.secondary" mt={2} fontSize={17}>Bring your experience, curiosity, and drive. We’ll provide a team environment where your contribution matters.</Typography></Box>
      <Grid container spacing={3}>{benefits.map(item => <Grid key={item.title} size={{ xs: 12, md: 4 }}><Paper sx={{ p: 4, height: '100%', borderRadius: 4, border: 1, borderColor: 'divider' }}><Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}>{item.icon}</Box><Typography variant="h5" fontWeight={900} mt={2.5}>{item.title}</Typography><Typography color="text.secondary" mt={1.25}>{item.copy}</Typography></Paper></Grid>)}</Grid>
    </Container>

    <Box id="open-positions" sx={{ bgcolor: 'action.hover', py: { xs: 7, md: 10 }, scrollMarginTop: 110 }}>
      <Container>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} spacing={2} mb={5}><Box><Typography color="secondary.main" fontWeight={900} letterSpacing={1.4} fontSize={13}>CAREER OPPORTUNITIES</Typography><Typography variant="h3" fontWeight={950} mt={1}>Available positions</Typography></Box><Typography color="text.secondary" maxWidth={460}>Explore current areas of interest and contact our team to confirm availability in your location.</Typography></Stack>
        <Stack spacing={3}>{positions.map((position, index) => <Paper key={position.title} sx={{ p: { xs: 3, md: 5 }, borderRadius: 5, border: 1, borderColor: 'divider' }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, lg: 4 }}><Chip label={`0${index + 1}`} color="primary" sx={{ fontWeight: 900 }} /><Typography variant="h4" fontWeight={950} mt={2}>{position.title}</Typography><Typography color="text.secondary" mt={1.5}>{position.intro}</Typography><Stack direction="row" flexWrap="wrap" useFlexGap gap={1} mt={2.5}><Chip label={position.department} variant="outlined" /><Chip label={position.location} variant="outlined" /><Chip label={position.type} variant="outlined" /></Stack></Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}><Stack direction="row" spacing={1.25} alignItems="center" mb={2}><RouteOutlinedIcon color="primary" /><Typography variant="h6" fontWeight={900}>Responsibilities</Typography></Stack><Stack spacing={1.25}>{position.responsibilities.map(item => <Stack direction="row" spacing={1.25} key={item}><CheckCircleRoundedIcon color="success" sx={{ mt: .35, fontSize: 19, flexShrink: 0 }} /><Typography color="text.secondary">{item}</Typography></Stack>)}</Stack></Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}><Stack direction="row" spacing={1.25} alignItems="center" mb={2}><SupportAgentOutlinedIcon color="primary" /><Typography variant="h6" fontWeight={900}>Qualifications</Typography></Stack><Stack spacing={1.25}>{position.qualifications.map(item => <Stack direction="row" spacing={1.25} key={item}><CheckCircleRoundedIcon color="success" sx={{ mt: .35, fontSize: 19, flexShrink: 0 }} /><Typography color="text.secondary">{item}</Typography></Stack>)}</Stack><Button component={RouterLink} to="/contact-us/" state={{ subject: `Career application: ${position.title}` }} variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 3 }}>Apply for this role</Button></Grid>
          </Grid>
        </Paper>)}</Stack>
      </Container>
    </Box>

    <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 7, md: 9 } }}><Container><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3}><Box><Typography variant="h3" fontWeight={950}>Don’t see the right role?</Typography><Typography sx={{ color: 'rgba(255,255,255,.72)', mt: 1.5, maxWidth: 650 }}>Introduce yourself to our recruiting team. We welcome interest from qualified transportation and logistics professionals.</Typography></Box><Button component={RouterLink} to="/contact-us/" size="large" variant="contained" color="secondary">Send your information</Button></Stack></Container></Box>
  </>
}

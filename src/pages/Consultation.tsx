import { useMemo, useRef, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import dayjs, { type Dayjs } from 'dayjs'
import { Seo } from '../components/common/Seo'
import { useContent } from '../contexts/ContentContext'
import { BookingCalendar } from '../features/consultation/BookingCalendar'
import { BookingForm, type BookingFormValues } from '../features/consultation/BookingForm'
import { BookingSummary } from '../features/consultation/BookingSummary'
import { Confirmation } from '../features/consultation/Confirmation'
import { createBooking, type BookingPayload } from '../features/consultation/bookingService'
import { services, type ConsultationService } from '../features/consultation/consultationData'

const benefits = [
  [InsightsOutlinedIcon, 'Personalized guidance', 'Focused recommendations shaped around your business, goals, and current challenges.'],
  [GroupsOutlinedIcon, 'Industry expertise', 'Practical insight from professionals who understand freight, trucking, dispatch, and CDL training.'],
  [CalendarMonthOutlinedIcon, 'Flexible scheduling', 'Choose an available weekday and time that works in your local time zone.'],
  [BoltOutlinedIcon, 'Fast response', 'Move from uncertainty to a clear next-step plan in one focused conversation.'],
  [AutoAwesomeOutlinedIcon, 'Professional recommendations', 'Leave with priorities, resources, and realistic actions—not generic advice.'],
  [SupportAgentOutlinedIcon, 'Dedicated support', 'A private session with time reserved specifically for your questions and goals.'],
] as const

const faqs = [
  ['How long is a consultation?', 'Sessions are 30, 45, or 60 minutes depending on the service you select. The duration is displayed before you book.'],
  ['Can I reschedule?', 'Yes. Rescheduling instructions will be included in your confirmation email. Please provide at least 24 hours’ notice when possible.'],
  ['What happens after booking?', 'You will receive a confirmation email with your appointment details, preparation notes, and meeting instructions.'],
  ['Are consultations refundable?', 'Consultation payments are generally refundable when canceled at least 24 hours before the scheduled start time.'],
  ['Which meeting platforms are supported?', 'You can request Google Meet, Zoom, Microsoft Teams, a phone call, or an in-person meeting. Availability may vary by service.'],
  ['How do I prepare?', 'Bring your most important questions, relevant business context, and any goals or decisions you want to address during the session.'],
] as const

export default function Consultation() {
  const { content } = useContent()
  const hero = content('consultants', 'hero', {
    section_label: 'PERSONALIZED GUIDANCE',
    title: 'Schedule a Consultation with Our Experts',
    body: 'Get practical, personalized guidance for your freight brokerage, trucking, dispatch, or CDL training goals. Choose your service and reserve a time in minutes.',
    button_text: 'Book Consultation',
    button_url: '#booking',
  })
  const benefitsSection = content('consultants', 'benefits', {
    section_label: 'WHY CONSULT',
    title: 'Why book a consultation?',
    body: 'One focused conversation can turn a complex challenge into a practical path forward.',
  })
  const servicesSection = content('consultants', 'services', {
    section_label: 'CONSULTATION OPTIONS',
    title: 'Choose your consultation',
    body: 'Compare focused sessions designed around the decisions that matter most to you.',
  })
  const pricingSection = content('consultants', 'pricing', {
    section_label: 'PRICING',
    title: 'Simple, transparent pricing',
    body: 'Every consultation includes expert preparation, your private session, and a clear set of next steps.',
  })
  const bookingRef = useRef<HTMLDivElement>(null)
  const [service, setService] = useState<ConsultationService>(services[0])
  const [date, setDate] = useState<Dayjs>(() => {
    let next = dayjs().add(1, 'day')
    while (next.day() === 0 || next.day() === 6) next = next.add(1, 'day')
    return next
  })
  const [time, setTime] = useState('')
  const [details, setDetails] = useState<BookingFormValues>()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState('')
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York', [])

  const scrollToBooking = () => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const chooseService = (selected: ConsultationService) => { setService(selected); setStep(0); setTime(''); setTimeout(scrollToBooking, 0) }
  const restart = () => { setStep(0); setTime(''); setDetails(undefined); setReference(''); setTimeout(scrollToBooking, 0) }
  const payload = details ? { service, date, time, timeZone, ...details } : undefined
  const confirm = async () => {
    if (!payload) return
    setSubmitting(true)
    const result = await createBooking(payload)
    setReference(result.reference)
    setStep(3)
    setSubmitting(false)
    setTimeout(scrollToBooking, 0)
  }

  return <>
    <Seo title="Consultation - Iman Logistics" canonical="/consultants/" />
    <Box sx={{
      position: 'relative',
      overflow: 'hidden',
      color: 'white',
      bgcolor: '#0A005A',
      backgroundImage: 'radial-gradient(circle at 86% 18%, rgba(255,255,255,.16), transparent 25%), linear-gradient(135deg, #0A005A 0%, #000081 65%, #1100a0 100%)',
      py: { xs: 9, md: 14 },
    }}>
      <Box sx={{ position: 'absolute', width: 360, height: 360, border: '1px solid rgba(255,255,255,.15)', borderRadius: '50%', right: -100, top: -120 }} />
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Chip label="Expert advice. Clear next steps." sx={{ bgcolor: 'rgba(255,255,255,.14)', color: 'white', fontWeight: 800, mb: 3 }} />
            <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 44, sm: 58, md: 72 }, lineHeight: 1.04, letterSpacing: '-.04em', maxWidth: 800 }}>{hero.title}</Typography>
            <Typography sx={{ fontSize: { xs: 18, md: 21 }, color: 'rgba(255,255,255,.85)', mt: 3, maxWidth: 720 }}>{hero.body}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mt={4} alignItems={{ sm: 'center' }}>
              <Button size="large" color="secondary" variant="contained" endIcon={<ArrowForwardIcon />} onClick={scrollToBooking}>{hero.button_text}</Button>
              <Stack direction="row" spacing={1} alignItems="center"><ShieldOutlinedIcon /><Typography fontWeight={700}>Private · Secure · No obligation</Typography></Stack>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={14} sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,.98)', color: 'text.primary' }}>
              <Stack spacing={2.5}>
                {['Choose the right consultation', 'Select your preferred date and time', 'Share your goals', 'Review and confirm'].map((label, index) => <Stack direction="row" spacing={2} alignItems="center" key={label}><Avatar sx={{ bgcolor: index === 0 ? 'secondary.main' : 'primary.main', width: 36, height: 36, fontSize: 15, fontWeight: 900 }}>{index + 1}</Avatar><Typography fontWeight={800}>{label}</Typography></Stack>)}
              </Stack>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Typical booking time</Typography><Typography color="primary" fontWeight={900}>Under 3 minutes</Typography></Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Section title={benefitsSection.title} subtitle={benefitsSection.body}>
      <Grid container spacing={3}>
        {benefits.map(([Icon, title, text]) => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={title}><Card variant="outlined" sx={cardSx}><CardContent sx={{ p: 3.5 }}><Avatar sx={{ bgcolor: 'rgba(10,0,90,.08)', color: 'primary.main', mb: 2 }}><Icon /></Avatar><Typography variant="h6" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1}>{text}</Typography></CardContent></Card></Grid>)}
      </Grid>
    </Section>

    <Section title={servicesSection.title} subtitle={servicesSection.body} gray>
      <Grid container spacing={3}>
        {services.map(item => {
          const Icon = item.icon
          return <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.id}>
            <Card variant="outlined" sx={{ ...cardSx, borderColor: service.id === item.id ? 'primary.main' : 'divider', position: 'relative' }}>
              {service.id === item.id && <Chip size="small" color="primary" label="Selected" sx={{ position: 'absolute', right: 18, top: 18, fontWeight: 800 }} />}
              <CardContent sx={{ p: 3.5, pb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, mb: 2 }}><Icon /></Avatar>
                <Typography variant="h6" color="primary" fontWeight={900} pr={8}>{item.name}</Typography>
                <Typography color="text.secondary" mt={1.5} minHeight={{ lg: 78 }}>{item.description}</Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mt={3}>
                  <Box><Typography variant="caption" color="text.secondary">Duration</Typography><Typography fontWeight={800}>{item.duration} minutes</Typography></Box>
                  <Typography variant="h4" color="primary" fontWeight={900}>${item.price}</Typography>
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 3.5, pb: 3.5 }}><Button fullWidth variant={service.id === item.id ? 'contained' : 'outlined'} onClick={() => chooseService(item)}>Book Now</Button></CardActions>
            </Card>
          </Grid>
        })}
      </Grid>
    </Section>

    <Section title={pricingSection.title} subtitle={pricingSection.body}>
      <Grid container spacing={3}>
        {services.slice(0, 3).map((item, index) => <Grid size={{ xs: 12, md: 4 }} key={item.id}>
          <Paper elevation={index === 1 ? 8 : 0} variant={index === 1 ? undefined : 'outlined'} sx={{ p: 4, height: '100%', borderRadius: 3, borderTop: '5px solid', borderTopColor: index === 1 ? 'secondary.main' : 'primary.main' }}>
            {index === 1 && <Chip color="secondary" label="Most popular" size="small" sx={{ mb: 2, fontWeight: 800 }} />}
            <Typography variant="h6" color="primary" fontWeight={900}>{item.name}</Typography>
            <Typography variant="h3" color="primary" fontWeight={900} mt={2}>${item.price}</Typography>
            <Typography color="text.secondary">{item.duration}-minute private session</Typography>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={1.5}>{item.includes.map(value => <Stack direction="row" spacing={1} key={value}><CheckCircleOutlineIcon color="success" fontSize="small" /><Typography>{value}</Typography></Stack>)}</Stack>
            <Button fullWidth variant="outlined" sx={{ mt: 4 }} onClick={() => chooseService(item)}>Choose consultation</Button>
          </Paper>
        </Grid>)}
      </Grid>
      <Alert severity="info" sx={{ mt: 3 }}>Prices shown are consultation fees. Applicable taxes, if any, will be calculated before payment is collected.</Alert>
    </Section>

    <Box ref={bookingRef} sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f7f8fb', py: { xs: 8, md: 12 }, scrollMarginTop: 24 }}>
      <Container>
        <Box textAlign="center" maxWidth={760} mx="auto" mb={5}>
          <Typography variant="overline" color="secondary" fontWeight={900} letterSpacing={1.5}>Secure your session</Typography>
          <Typography component="h2" variant="h2" color="primary" sx={{ fontSize: { xs: 36, md: 52 }, mt: 1 }}>Book your consultation</Typography>
          <Typography color="text.secondary" fontSize={18} mt={1.5}>You’re booking <strong>{service.name}</strong> · {service.duration} minutes · ${service.price}</Typography>
        </Box>
        {step < 3 && <Stepper activeStep={step} alternativeLabel sx={{ maxWidth: 760, mx: 'auto', mb: 5 }}>
          {['Date & time', 'Your details', 'Review'].map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>}
        {step === 0 && <>
          <BookingCalendar date={date} time={time} onDateChange={value => { setDate(value); setTime('') }} onTimeChange={setTime} />
          <Stack direction="row" justifyContent="flex-end" mt={3}><Button size="large" variant="contained" disabled={!time} onClick={() => setStep(1)}>Continue to details</Button></Stack>
        </>}
        {step === 1 && <Box maxWidth={900} mx="auto"><BookingForm defaultValues={details} onContinue={values => { setDetails(values); setStep(2) }} /><Button onClick={() => setStep(0)} sx={{ mt: 2 }}>Back to calendar</Button></Box>}
        {step === 2 && details && <BookingSummary service={service} date={date} time={time} timeZone={timeZone} details={details} submitting={submitting} onEdit={() => setStep(1)} onConfirm={confirm} />}
        {step === 3 && payload && <Confirmation booking={payload as BookingPayload} reference={reference} onRestart={restart} />}
      </Container>
    </Box>

    <Section title="Frequently asked questions" subtitle="Everything you need to know before your consultation.">
      <Box maxWidth={900} mx="auto">
        {faqs.map(([question, answer]) => <Accordion key={question} disableGutters elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', '&:before': { display: 'none' } }}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={800} color="primary">{question}</Typography></AccordionSummary><AccordionDetails><Typography color="text.secondary">{answer}</Typography></AccordionDetails></Accordion>)}
      </Box>
    </Section>

    <Box sx={{ bgcolor: '#0A005A', color: 'white', py: { xs: 8, md: 11 }, textAlign: 'center' }}>
      <Container maxWidth="md">
        <Typography component="h2" variant="h2" sx={{ fontSize: { xs: 36, md: 52 } }}>Ready to move forward with clarity?</Typography>
        <Typography fontSize={19} color="rgba(255,255,255,.8)" mt={2}>Reserve a focused consultation and get the expert guidance you need to take your next step with confidence.</Typography>
        <Button size="large" color="secondary" variant="contained" onClick={scrollToBooking} sx={{ mt: 4 }}>Schedule your consultation</Button>
      </Container>
    </Box>
  </>
}

function Section({ title, subtitle, gray, children }: { title: string; subtitle: string; gray?: boolean; children: React.ReactNode }) {
  return <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: theme => gray ? (theme.palette.mode === 'dark' ? '#10131e' : '#f7f8fb') : theme.palette.background.default }}><Container><Box textAlign="center" maxWidth={760} mx="auto" mb={6}><Typography component="h2" variant="h2" color="primary" sx={{ fontSize: { xs: 36, md: 52 } }}>{title}</Typography><Typography color="text.secondary" fontSize={18} mt={1.5}>{subtitle}</Typography></Box>{children}</Container></Box>
}

const cardSx = {
  height: '100%',
  borderRadius: 3,
  borderColor: 'divider',
  transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 14px 36px rgba(10,0,90,.10)', borderColor: 'rgba(10,0,90,.25)' },
}

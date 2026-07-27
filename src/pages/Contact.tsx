import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import PhoneCallbackOutlinedIcon from '@mui/icons-material/PhoneCallbackOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link as RouterLink } from 'react-router-dom'
import { z } from 'zod'
import { Seo } from '../components/common/Seo'
import { useContent } from '../contexts/ContentContext'
import { Reveal } from '../components/common/Reveal'
import { submitContact } from '../services/contact'
import mapImage from '../assets/images/mapusa-2048x1269.png'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  company: z.string().max(100, 'Company name is too long').optional(),
  email: z.email('Enter a valid email address'),
  phone: z.string().regex(/^[+()\d\s.-]{7,20}$/, 'Enter a valid phone number'),
  subject: z.string().trim().min(3, 'Enter a subject'),
  message: z.string().trim().min(20, 'Please provide at least 20 characters'),
  preferredMethod: z.string().min(1, 'Select a contact method'),
  service: z.string().min(1, 'Select a service'),
  consent: z.boolean().refine(Boolean, 'Please confirm that we may contact you'),
})
type ContactValues = z.infer<typeof schema>

const methods = [
  [PhoneCallbackOutlinedIcon, 'Request a call', 'Share your number and preferred method. Our team can respond through the details you provide.', '#contact-form', 'Request callback'],
  [EmailOutlinedIcon, 'Send a message', 'Use the secure form for questions about training, consultation, or general information.', '#contact-form', 'Write to us'],
  [CalendarMonthOutlinedIcon, 'Book consultation', 'Choose a focused service, available date, and time through our complete booking experience.', '/consultants/', 'View availability'],
  [BusinessOutlinedIcon, 'Request information', 'Tell us which learning path interests you and what information would help you decide.', '#contact-form', 'Request details'],
] as const

const faqs = [
  ['Which program is right for me?', 'Tell us about your current experience and goals. We can help direct you toward dispatch training, freight broker training, trucking school, or a focused consultation.'],
  ['How quickly will I receive a response?', 'Response times depend on message volume. Providing a clear subject, preferred contact method, and detailed message helps us respond efficiently.'],
  ['Can I schedule a consultation online?', 'Yes. The Consultation page lets you select a service, available business day, time slot, and meeting preference.'],
  ['Can I attach supporting information?', 'Yes. The form accepts one optional file up to 5 MB for context. Backend file delivery can be connected to your preferred storage provider.'],
  ['What should I include in my message?', 'Share your current situation, the service that interests you, your main questions, and the result you hope to achieve.'],
  ['Are in-person meetings available?', 'In-person availability is confirmed individually. Location details are shared only after an eligible appointment is confirmed.'],
] as const

const hours = [
  ['Sunday', 'Closed'],
  ['Monday', '9:00 AM – 5:00 PM'],
  ['Tuesday', '9:00 AM – 5:00 PM'],
  ['Wednesday', '9:00 AM – 5:00 PM'],
  ['Thursday', '9:00 AM – 5:00 PM'],
  ['Friday', '9:00 AM – 5:00 PM'],
  ['Saturday', 'Closed'],
] as const

export default function Contact() {
  const { content } = useContent()
  const hero = content('contact-us', 'hero', {
    section_label: 'LET’S START A CONVERSATION',
    title: 'Questions deserve clear answers.',
    body: 'Contact Iman Logistics for training information, consultation guidance, or help choosing your next step in freight and trucking.',
    button_text: 'Send a message',
    button_url: '#contact-form',
  })
  const formContent = content('contact-us', 'form', {
    section_label: 'TELL US HOW WE CAN HELP',
    title: 'Send a detailed message',
    body: 'Required fields help us understand your request and respond through your preferred method.',
  })
  const cta = content('contact-us', 'cta', {
    section_label: 'CONTACT IMAN LOGISTICS',
    title: 'Let’s make your next step clearer.',
    body: 'Send your questions today or reserve a focused consultation when you’re ready for personalized guidance.',
    button_text: 'Contact Iman Logistics',
    button_url: '#contact-form',
  })
  const [sent, setSent] = useState(false)
  const [attachment, setAttachment] = useState<File>()
  const [fileError, setFileError] = useState('')
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    defaultValues: { preferredMethod: 'Email', service: '', consent: false },
  })
  const fileLabel = useMemo(() => attachment ? `${attachment.name} · ${(attachment.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, DOC, DOCX, PNG or JPG · max 5 MB', [attachment])
  const onFile = (files: FileList | null) => {
    const file = files?.[0]
    setFileError('')
    if (!file) { setAttachment(undefined); return }
    if (file.size > 5 * 1024 * 1024) { setFileError('File must be 5 MB or smaller'); return }
    setAttachment(file)
  }
  const onSubmit = async (values: ContactValues) => {
    setSent(false)
    await submitContact({ name: values.fullName, email: values.email, subject: values.subject, message: values.message })
    setSent(true)
    setAttachment(undefined)
    reset()
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return <>
    <Seo title="Contact Us - Iman Logistics" canonical="/contact-us/" />
    <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#0A005A', color: 'white', py: { xs: 9, md: 14 }, backgroundImage: 'radial-gradient(circle at 12% 20%,rgba(255,255,255,.12),transparent 25%),linear-gradient(135deg,#0A005A,#000081)' }}>
      <Box sx={{ position: 'absolute', width: 420, height: 420, border: '1px solid rgba(255,255,255,.15)', borderRadius: '50%', right: -120, top: -180 }} />
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}><Reveal><Chip label={hero.section_label} sx={{ bgcolor: 'rgba(255,255,255,.13)', color: 'white', fontWeight: 800, mb: 3 }} /><Typography component="h1" variant="h1" sx={{ fontSize: { xs: 47, sm: 62, md: 76 }, lineHeight: 1.02, letterSpacing: '-.045em' }}>{hero.title}</Typography><Typography fontSize={{ xs: 18, md: 21 }} color="rgba(255,255,255,.82)" mt={3} maxWidth={700}>{hero.body}</Typography><Button href={hero.button_url || '#contact-form'} color="secondary" variant="contained" size="large" endIcon={<ArrowForwardIcon />} sx={{ mt: 4 }}>{hero.button_text}</Button></Reveal></Grid>
          <Grid size={{ xs: 12, md: 5 }}><Reveal delay={130}><Paper sx={{ p: 3.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,.11)', color: 'white', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.2)' }}><Avatar sx={{ bgcolor: 'secondary.main', width: 58, height: 58, mb: 2.5 }}><HeadsetMicOutlinedIcon fontSize="large" /></Avatar><Typography variant="h5" fontWeight={900}>We’ll help route your request</Typography><Typography color="rgba(255,255,255,.78)" mt={1}>Select the service and contact method that fit your needs. The form is structured to give our team useful context from the start.</Typography><Stack direction="row" spacing={1} mt={3} flexWrap="wrap" useFlexGap><Chip label="Training" sx={heroChip} /><Chip label="Consultation" sx={heroChip} /><Chip label="General questions" sx={heroChip} /></Stack></Paper></Reveal></Grid>
        </Grid>
      </Container>
    </Box>

    <Section eyebrow="Choose your path" title="How would you like to connect?">
      <Grid container spacing={3}>{methods.map(([Icon, title, text, href, action], index) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={title}><Reveal delay={index * 60} height="100%"><Card variant="outlined" sx={cardSx}><CardActionArea component={href.startsWith('/') ? RouterLink : 'a'} to={href.startsWith('/') ? href : undefined} href={href.startsWith('#') ? href : undefined} sx={{ height: '100%', p: .5 }}><CardContent sx={{ p: 3 }}><Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50, mb: 2.5 }}><Icon /></Avatar><Typography variant="h6" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1} minHeight={{ lg: 106 }}>{text}</Typography><Typography color="secondary" fontWeight={900} mt={2}>{action} →</Typography></CardContent></CardActionArea></Card></Reveal></Grid>)}</Grid>
    </Section>

    <Box component="section" id="contact-form" sx={{ py: { xs: 8, md: 12 }, bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f7f8fb', scrollMarginTop: 24 }}>
      <Container>
        <Reveal textAlign="center" maxWidth={780} mx="auto" mb={6}><Typography variant="overline" color="secondary" fontWeight={900} letterSpacing={1.4}>{formContent.section_label}</Typography><Typography component="h2" variant="h2" color="primary" fontSize={{ xs: 38, md: 55 }} mt={1}>{formContent.title}</Typography><Typography color="text.secondary" fontSize={18} mt={1.5}>{formContent.body}</Typography></Reveal>
        <Grid container spacing={4} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Reveal><Paper component="form" onSubmit={handleSubmit(onSubmit)} noValidate variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
              {sent && <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}><strong>Message submitted.</strong> Thank you for contacting Iman Logistics.</Alert>}
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Full Name" autoComplete="name" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Company (optional)" autoComplete="organization" {...register('company')} error={!!errors.company} helperText={errors.company?.message} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Email Address" type="email" autoComplete="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Phone Number" autoComplete="tel" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth label="Preferred Contact Method" {...register('preferredMethod')} error={!!errors.preferredMethod} helperText={errors.preferredMethod?.message}>{['Email', 'Phone Call', 'Text Message', 'Video Meeting'].map(value => <MenuItem value={value} key={value}>{value}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth label="Service Interested In" {...register('service')} error={!!errors.service} helperText={errors.service?.message}>{['Freight Dispatch Masterclass', 'Freight Broker Masterclass', 'Iman Trucking School', 'Shipment Tracking', 'Car Auto Sales', 'Professional Consultation', 'General Information'].map(value => <MenuItem value={value} key={value}>{value}</MenuItem>)}</TextField></Grid>
                <Grid size={12}><TextField fullWidth label="Subject" {...register('subject')} error={!!errors.subject} helperText={errors.subject?.message} /></Grid>
                <Grid size={12}><TextField fullWidth multiline minRows={6} label="Message" {...register('message')} error={!!errors.message} helperText={errors.message?.message || 'Include your goals, questions, and any context that may help us respond.'} /></Grid>
                <Grid size={12}>
                  <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} sx={{ mr: 2 }}>Attach file<input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => onFile(event.target.files)} /></Button>
                  <Typography component="span" variant="body2" color={fileError ? 'error' : 'text.secondary'}>{fileError || fileLabel}</Typography>
                </Grid>
                <Grid size={12}><Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}><Stack direction="row" spacing={1.5} alignItems="center"><ShieldOutlinedIcon color="primary" /><Box><Typography fontWeight={800}>Google reCAPTCHA ready</Typography><Typography variant="body2" color="text.secondary">Connect your production site key before launch.</Typography></Box></Stack></Paper></Grid>
                <Grid size={12}><FormControlLabel control={<Checkbox {...register('consent')} />} label="I agree that Iman Logistics may contact me about this request." /><Typography color="error" variant="caption" display="block">{errors.consent?.message}</Typography></Grid>
                <Grid size={12}><Button type="submit" variant="contained" size="large" disabled={isSubmitting || !!fileError} startIcon={isSubmitting ? <CircularProgress color="inherit" size={18} /> : <SendOutlinedIcon />}>{isSubmitting ? 'Sending…' : 'Submit message'}</Button></Grid>
              </Grid>
            </Paper></Reveal>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}><Reveal delay={100}><Stack spacing={2.5}>
            <InfoCard icon={<AccessTimeOutlinedIcon />} title="Business hours" text="Monday–Friday · 9:00 AM–5:00 PM" />
            <InfoCard icon={<EmailOutlinedIcon />} title="Email inquiries" text="Send your request securely through this form." />
            <InfoCard icon={<PhoneCallbackOutlinedIcon />} title="Phone inquiries" text="Choose Phone Call as your preferred method and provide your number." />
            <InfoCard icon={<LocationOnOutlinedIcon />} title="In-person meetings" text="Location details are provided after an eligible appointment is confirmed." />
          </Stack></Reveal></Grid>
        </Grid>
      </Container>
    </Box>

    <Section eyebrow="Service area" title="Connected across the logistics landscape">
      <Grid container spacing={5} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}><Reveal><Paper variant="outlined" sx={{ position: 'relative', overflow: 'hidden', borderRadius: 4, p: 2, bgcolor: theme => theme.palette.mode === 'dark' ? '#10131e' : '#f7f8fb' }}><Box component="img" src={mapImage} loading="lazy" alt="United States service area map" sx={{ width: '100%', display: 'block' }} /><Chip icon={<LocationOnOutlinedIcon />} label="Service and education support" color="primary" sx={{ position: 'absolute', left: 26, bottom: 26, fontWeight: 800 }} /></Paper></Reveal></Grid>
        <Grid size={{ xs: 12, md: 5 }}><Reveal delay={100}><Typography variant="h3" color="primary" fontWeight={900}>Online-first support</Typography><Typography fontSize={18} mt={2}>Training information and consultations can be handled online, giving visitors a clear way to connect from wherever they are.</Typography><Typography color="text.secondary" mt={2}>A public street address was not available on the source website, so this page does not fabricate a map pin. Directions and meeting-location details can be enabled when verified office information is provided.</Typography><Button component={RouterLink} to="/consultants/" variant="outlined" sx={{ mt: 3 }}>View consultation options</Button></Reveal></Grid>
      </Grid>
    </Section>

    <Section eyebrow="Availability" title="Business hours and response planning" gray>
      <Grid container spacing={4} alignItems="stretch">
        <Grid size={{ xs: 12, md: 7 }}><Reveal height="100%"><Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4, height: '100%' }}>{hours.map(([day, time]) => <Stack direction="row" justifyContent="space-between" alignItems="center" key={day} sx={{ py: 1.5, px: 2, borderRadius: 2, bgcolor: day === today ? 'primary.main' : 'transparent', color: day === today ? 'primary.contrastText' : 'text.primary' }}><Typography fontWeight={day === today ? 900 : 700}>{day}{day === today && ' · Today'}</Typography><Typography fontWeight={700}>{time}</Typography></Stack>)}</Paper></Reveal></Grid>
        <Grid size={{ xs: 12, md: 5 }}><Reveal delay={100} height="100%"><Paper sx={{ p: 4, borderRadius: 4, height: '100%', bgcolor: '#0A005A', color: 'white' }}><Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56, mb: 3 }}><ChatBubbleOutlineIcon /></Avatar><Typography variant="h4" fontWeight={900}>Need focused guidance?</Typography><Typography color="rgba(255,255,255,.78)" mt={2}>A consultation reserves dedicated time for freight brokerage, trucking, dispatch, or CDL training questions.</Typography><Button component={RouterLink} to="/consultants/" color="secondary" variant="contained" sx={{ mt: 4 }}>Book consultation</Button></Paper></Reveal></Grid>
      </Grid>
    </Section>

    <Section eyebrow="Common questions" title="Before you send your message">
      <Box maxWidth={900} mx="auto">{faqs.map(([question, answer]) => <Accordion key={question} disableGutters elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', '&:before': { display: 'none' } }}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography color="primary" fontWeight={900}>{question}</Typography></AccordionSummary><AccordionDetails><Typography color="text.secondary">{answer}</Typography></AccordionDetails></Accordion>)}</Box>
    </Section>

    <Alert severity="info" icon={<HeadsetMicOutlinedIcon />} sx={{ borderRadius: 0, py: 2, justifyContent: 'center' }}>For urgent safety situations or emergencies, contact the appropriate local emergency service. Iman Logistics does not advertise an emergency-response line.</Alert>

    <Box sx={{ bgcolor: '#0A005A', color: 'white', textAlign: 'center', py: { xs: 8, md: 11 } }}><Container maxWidth="md"><Typography variant="h2" fontSize={{ xs: 39, md: 56 }}>{cta.title}</Typography><Typography fontSize={19} color="rgba(255,255,255,.8)" mt={2}>{cta.body}</Typography><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={2} mt={4}><Button href={cta.button_url || '#contact-form'} color="secondary" variant="contained" size="large">{cta.button_text}</Button><Button component={RouterLink} to="/consultants/" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'white' }}>Schedule consultation</Button></Stack></Container></Box>
  </>
}

function Section({ eyebrow, title, gray, children }: { eyebrow: string; title: string; gray?: boolean; children: React.ReactNode }) {
  return <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: theme => gray ? (theme.palette.mode === 'dark' ? '#10131e' : '#f7f8fb') : 'background.default' }}><Container><Reveal textAlign="center" maxWidth={800} mx="auto" mb={6}><Typography variant="overline" color="secondary" fontWeight={900} letterSpacing={1.4}>{eyebrow}</Typography><Typography component="h2" variant="h2" color="primary" sx={{ fontSize: { xs: 38, md: 54 }, mt: 1 }}>{title}</Typography></Reveal>{children}</Container></Box>
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Stack direction="row" spacing={2}><Avatar sx={{ bgcolor: 'primary.main' }}>{icon}</Avatar><Box><Typography color="primary" fontWeight={900}>{title}</Typography><Typography variant="body2" color="text.secondary" mt={.5}>{text}</Typography></Box></Stack></Paper>
}

const heroChip = { color: 'white', bgcolor: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)' }
const cardSx = { height: '100%', borderRadius: 3.5, transition: 'transform .22s ease, box-shadow .22s ease, border-color .22s ease', '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 18px 45px rgba(10,0,90,.12)', borderColor: 'primary.main' } }

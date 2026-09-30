import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EditIcon from '@mui/icons-material/Edit'
import ErrorIcon from '@mui/icons-material/Error'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import HomeIcon from '@mui/icons-material/Home'
import PersonIcon from '@mui/icons-material/Person'
import PlaceIcon from '@mui/icons-material/Place'
import PolicyIcon from '@mui/icons-material/Policy'
import PrintIcon from '@mui/icons-material/Print'
import SchoolIcon from '@mui/icons-material/School'
import VideocamIcon from '@mui/icons-material/Videocam'
import { useLocation, useNavigate } from 'react-router-dom'
import { runtimeConfig } from '../../lib/runtimeConfig'
import { createBrokerRegistration, listBrokerClasses, resendRegistrationCode, startBrokerCheckout, startRegistrationVerification, verifyRegistrationCode, type BrokerClass, type CreatedRegistration, type RegistrationDetails, type RegistrationForm, type VerificationState } from './api'
import { PolicyAgreement } from './PolicyAgreement'
import { FREIGHT_BROKER_POLICY_TEXT, FREIGHT_BROKER_PROGRAM, FREIGHT_BROKER_STEPS, isPolicySigned } from './program'
import { RegistrationPaymentStatus } from './RegistrationPaymentStatus'

// Freight Dispatch Masterclass registration, matching the live Dispatcher Class
// Registration page (imantruckingschool.com/dispatcher-registration/):
// "Your information" → "Review & policy" → "Confirmation", with the
// "Upcoming sessions" list beside the form. Embedded on the Freight Dispatch
// Masterclass page as the #register section.

const pendingRegistrationStorageKey = 'iman_freight_broker_pending_reg'
const emptyForm: RegistrationForm = { firstName: '', lastName: '', email: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', classId: '', attendanceType: 'online', verificationId: '', verificationToken: '' }
const dollars = (cents?: number | null) => (cents ?? FREIGHT_BROKER_PROGRAM.defaultPriceCents) / 100
const mediumDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : null
const scrollToSection = () => window.setTimeout(() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

type Pending = { formData?: RegistrationForm; registration?: CreatedRegistration; paymentPolicyAccepted?: boolean; paymentPolicySignature?: string }
const readPending = (): Pending => { try { return JSON.parse(sessionStorage.getItem(pendingRegistrationStorageKey) || '{}') } catch { return {} } }
const writePending = (value: Pending) => { try { sessionStorage.setItem(pendingRegistrationStorageKey, JSON.stringify(value)) } catch { /* storage unavailable */ } }
const clearPending = () => { try { sessionStorage.removeItem(pendingRegistrationStorageKey) } catch { /* storage unavailable */ } }

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>{icon}<Typography fontWeight={800} variant="subtitle1">{title}</Typography></Stack>
}

function statusChipColor(status?: string) {
  switch (status) {
    case 'FULL': return 'warning'
    case 'CLOSED': return 'default'
    case 'COMPLETED': return 'info'
    default: return 'success'
  }
}

const isSessionFull = (c: BrokerClass) => c.status === 'FULL' || (c.seat_capacity != null && (c.seats_remaining ?? 0) <= 0)
const deadlinePassed = (c: BrokerClass) => Boolean(c.registration_deadline && new Date(c.registration_deadline) < new Date())
const isSessionSelectable = (c: BrokerClass) => (c.status || 'OPEN') === 'OPEN' && !isSessionFull(c) && !deadlinePassed(c)
const sessionDates = (c?: BrokerClass) => c?.starts_at ? `${mediumDate(c.starts_at)}${c.ends_at ? ` – ${mediumDate(c.ends_at)}` : ''}` : 'Rolling enrollment'
const sessionPlace = (c?: BrokerClass) => c?.allows_online && c?.allows_in_person ? 'Online / Zoom or In Person' : c?.allows_in_person ? (c.location || 'In Person') : 'Online / Zoom'

function SessionCard({ c, selected, onSelect }: { c: BrokerClass; selected: boolean; onSelect: () => void }) {
  const full = isSessionFull(c)
  const selectable = isSessionSelectable(c)
  const displayStatus = full && (c.status || 'OPEN') === 'OPEN' ? 'FULL' : (c.status || 'OPEN')
  return (
    <Paper
      variant="outlined"
      role="radio"
      aria-checked={selected}
      aria-disabled={!selectable}
      aria-label={`${c.name}, ${sessionDates(c)}`}
      tabIndex={selectable ? 0 : -1}
      onClick={() => selectable && onSelect()}
      onKeyDown={event => { if (selectable && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect() } }}
      sx={{ p: 2, borderRadius: 3, cursor: selectable ? 'pointer' : 'not-allowed', opacity: selectable ? 1 : 0.6, borderColor: selected ? 'secondary.main' : 'divider', borderWidth: selected ? 2 : 1, bgcolor: selected ? 'action.selected' : 'background.paper', transition: 'border-color .15s, background-color .15s', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main' } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Typography fontWeight={800} variant="body1">{c.name}</Typography>
        <Chip size="small" label={displayStatus} color={statusChipColor(displayStatus)} />
      </Stack>
      {c.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{c.description}</Typography>}
      <Stack spacing={0.5} sx={{ mt: 1.25 }}>
        <Stack direction="row" alignItems="center" gap={0.75}><EventAvailableIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{sessionDates(c)}</Typography></Stack>
        {(c.days_of_week || c.class_time) && <Typography variant="body2" color="text.secondary" sx={{ pl: 3.25 }}>{[c.days_of_week, c.class_time].filter(Boolean).join(' · ')}</Typography>}
        {c.registration_deadline && <Typography variant="caption" color="warning.dark" sx={{ pl: 3.25 }}>Register by {mediumDate(c.registration_deadline)}</Typography>}
        <Stack direction="row" alignItems="center" gap={0.75}>
          {c.delivery_mode === 'online' ? <VideocamIcon fontSize="small" color="action" /> : <PlaceIcon fontSize="small" color="action" />}
          <Typography variant="body2" color="text.secondary">{sessionPlace(c)}</Typography>
        </Stack>
        {c.instructor_name && <Typography variant="body2" color="text.secondary" sx={{ pl: 3.25 }}>Instructor: {c.instructor_name}</Typography>}
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
        <Stack>
          <Typography variant="h6" fontWeight={950} color="secondary.main">${dollars(c.price_cents).toFixed(2)}</Typography>
          {c.seat_capacity != null && <Typography variant="caption" color={full ? 'error.main' : 'text.secondary'}>{full ? 'No seats left' : `${c.seats_remaining} seat${c.seats_remaining === 1 ? '' : 's'} left`}</Typography>}
        </Stack>
        <Button size="small" variant={selected ? 'contained' : 'outlined'} color="secondary" disabled={!selectable} tabIndex={-1} onClick={event => { event.stopPropagation(); if (selectable) onSelect() }}>
          {selected ? 'Selected' : full ? 'Full' : 'Register now'}
        </Button>
      </Stack>
    </Paper>
  )
}

export function FreightBrokerRegistration() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const paymentSessionId = searchParams.get('session_id')
  const paymentState = searchParams.get('payment') || ''
  const formSectionRef = useRef<HTMLDivElement | null>(null)

  const [classes, setClasses] = useState<BrokerClass[]>([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [classesError, setClassesError] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'review' | 'success' | 'error'>('idle')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentPolicyAccepted, setPaymentPolicyAccepted] = useState(false)
  const [paymentPolicySignature, setPaymentPolicySignature] = useState('')
  const [registration, setRegistration] = useState<CreatedRegistration | null>(null)
  const [confirmed, setConfirmed] = useState<RegistrationDetails | null>(null)
  const [paidAmountCents, setPaidAmountCents] = useState<number | null>(null)
  const [formData, setFormData] = useState<RegistrationForm>(emptyForm)
  const [honeypot, setHoneypot] = useState('')
  const [showStatus, setShowStatus] = useState(Boolean(paymentSessionId))
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [verificationLoading, setVerificationLoading] = useState(false)
  // Once codes are sent, trust the server's answer: a stale runtime config
  // must not leave the student waiting for an SMS that never comes.
  const phoneVerificationRequired = verification?.phoneVerificationRequired ?? runtimeConfig.registrationPhoneVerification
  const contactVerified = emailVerified && (phoneVerified || !phoneVerificationRequired) && Boolean(formData.verificationToken)

  // Restore the pending registration when returning from (or canceling) Stripe.
  useEffect(() => {
    const cached = readPending()
    if (cached.formData) setFormData(current => ({ ...current, ...cached.formData }))
    if (cached.registration) setRegistration(cached.registration)
    if (cached.paymentPolicyAccepted) setPaymentPolicyAccepted(true)
    if (cached.paymentPolicySignature) setPaymentPolicySignature(cached.paymentPolicySignature)
    if (paymentSessionId) scrollToSection()
  }, [paymentSessionId])

  // Load the sessions, and reload them whenever the visitor returns to the tab
  // so changes made in the back office show without a manual refresh.
  useEffect(() => {
    const load = () => listBrokerClasses()
      .then(data => { setClasses(data); setClassesError('') })
      .catch(() => setClassesError('Class sessions could not be loaded. Please refresh the page to try again.'))
      .finally(() => setClassesLoading(false))
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Keep the selection on a session that can still be registered for, so the
  // registrant never reviews one session and pays for another.
  useEffect(() => {
    if (classes.length > 0 && !classes.some(item => item.id === formData.classId && isSessionSelectable(item))) {
      const firstOpen = classes.find(isSessionSelectable)
      setFormData(current => ({ ...current, classId: firstOpen?.id ?? '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes])

  useEffect(() => {
    const selected = classes.find(item => item.id === formData.classId)
    if (!selected) return
    if (formData.attendanceType === 'online' && !selected.allows_online) setFormData(current => ({ ...current, attendanceType: 'in_person' }))
    if (formData.attendanceType === 'in_person' && !selected.allows_in_person) setFormData(current => ({ ...current, attendanceType: 'online' }))
  }, [classes, formData.classId, formData.attendanceType])

  const selectedClass = classes.find(item => item.id === (formData.classId || registration?.class_id))
  const price = dollars(selectedClass?.price_cents)
  const activeStep = state === 'review' ? 1 : state === 'success' ? 2 : 0
  const update = (field: keyof RegistrationForm) => (event: { target: { value: string } }) => setFormData(current => ({ ...current, [field]: event.target.value }))

  function selectClass(classId: string) {
    setFormData(current => ({ ...current, classId }))
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function changeContact(field: 'email' | 'phone', value: string) {
    // Without SMS verification the phone is an ordinary form field.
    if (field === 'phone' && !phoneVerificationRequired) return setFormData(current => ({ ...current, phone: value }))
    setFormData(current => ({ ...current, [field]: value, verificationId: '', verificationToken: '' }))
    setVerification(null); setEmailVerified(false); setPhoneVerified(false); setEmailCode(''); setPhoneCode('')
  }

  async function sendVerificationCodes() {
    setPaymentError(''); setVerificationLoading(true)
    try {
      const result = await startRegistrationVerification(formData.email, phoneVerificationRequired ? formData.phone : undefined)
      setVerification(result)
      setFormData(current => ({ ...current, email: result.email, phone: phoneVerificationRequired ? result.phone : current.phone, verificationId: result.id, verificationToken: '' }))
    } catch (caught) { setPaymentError(caught instanceof Error ? caught.message : 'Unable to send verification codes.') }
    finally { setVerificationLoading(false) }
  }

  async function verifyCode(channel: 'email' | 'phone') {
    if (!verification) return
    setPaymentError(''); setVerificationLoading(true)
    try {
      const result = await verifyRegistrationCode(verification.id, channel, channel === 'email' ? emailCode : phoneCode)
      setEmailVerified(result.emailVerified); setPhoneVerified(result.phoneVerified)
      if (result.verificationToken) setFormData(current => ({ ...current, verificationId: verification.id, verificationToken: result.verificationToken! }))
    } catch (caught) { setPaymentError(caught instanceof Error ? caught.message : 'The verification code could not be confirmed.') }
    finally { setVerificationLoading(false) }
  }

  function clearReturnParams() {
    navigate(`${location.pathname}#register`, { replace: true })
    setShowStatus(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!contactVerified) return setPaymentError(phoneVerificationRequired ? 'Verify both your email address and phone number before continuing.' : 'Verify your email address before continuing.')
    if (!formData.classId) return setPaymentError('Please select a Freight Dispatch Masterclass session to continue.')
    setPaymentError('')
    setState('saving')
    try {
      // The registration is created by the API with the server-side key.
      const data = await createBrokerRegistration({ ...formData, website: honeypot })
      setRegistration(data)
      writePending({ formData, registration: data })
      setState('review')
      scrollToSection()
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Unable to save registration')
      setState('error')
    }
  }

  async function handlePayment() {
    if (!registration) return
    if (!paymentPolicyAccepted) return setPaymentError('You must check the box agreeing to the non-refundable registration policy before paying.')
    if (!paymentPolicySignature.trim()) return setPaymentError('Please type your full legal name to electronically sign the policy.')
    if (!isPolicySigned(paymentPolicyAccepted, paymentPolicySignature, formData.firstName, formData.lastName)) {
      return setPaymentError(`Type your full legal name ("${`${formData.firstName} ${formData.lastName}`.trim()}") to sign before paying.`)
    }
    writePending({ formData, registration, paymentPolicyAccepted, paymentPolicySignature })
    setPaymentLoading(true)
    setPaymentError('')
    try {
      await startBrokerCheckout(registration, formData.email, paymentPolicySignature)
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Failed to initiate payment')
      setPaymentLoading(false)
    }
  }

  function editRegistration() {
    // The server consumed the one-time verification grant when this
    // registration was saved, so saving again needs a fresh verification.
    setFormData(current => ({ ...current, verificationId: '', verificationToken: '' }))
    setVerification(null); setEmailVerified(false); setPhoneVerified(false); setEmailCode(''); setPhoneCode('')
    setPaymentError('')
    setState('idle')
    scrollToSection()
  }

  if (paymentSessionId && showStatus) {
    return <RegistrationPaymentStatus
      sessionId={paymentSessionId}
      returnState={paymentState}
      onContinue={result => {
        if (result.registration) setConfirmed(result.registration)
        if (result.amount_cents != null) setPaidAmountCents(result.amount_cents)
        clearPending()
        clearReturnParams()
        setState('success')
      }}
      onRetry={() => { clearReturnParams(); setState(registration ? 'review' : 'idle') }}
      onDismiss={() => { clearReturnParams(); setState(registration ? 'review' : 'idle') }}
    />
  }

  const header = (
    <Stack direction="row" alignItems="center" gap={2} sx={{ mb: { xs: 3, md: 4 } }}>
      <BusinessCenterIcon sx={{ fontSize: { xs: 36, md: 44 }, color: 'secondary.main' }} />
      <Typography variant="h4" component="h2" fontWeight={900} sx={{ fontSize: { xs: 26, md: 34 } }}>{FREIGHT_BROKER_PROGRAM.name} Registration</Typography>
    </Stack>
  )

  const stepper = (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: { xs: 3, md: 4 } }}>
      {FREIGHT_BROKER_STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
    </Stepper>
  )

  if (state === 'success') {
    const regNo = confirmed?.registrationNo || registration?.registration_no || 'FBM-CONFIRMED'
    const firstName = confirmed?.firstName || formData.firstName || 'Student'
    const lastName = confirmed?.lastName || formData.lastName || ''
    const address = confirmed?.address
      ? `${confirmed.address}, ${confirmed.city}, ${confirmed.state} ${confirmed.zip}`
      : formData.address1 ? `${formData.address1}${formData.address2 ? `, ${formData.address2}` : ''}, ${formData.city}, ${formData.state} ${formData.zip}` : '—'
    // Prefer the amount Stripe actually charged over the client-side price.
    const total = paidAmountCents != null ? paidAmountCents / 100 : price
    const summaryRows: [string, string][] = [
      ['Registrant', `${firstName} ${lastName}`],
      ['Email address', confirmed?.email || formData.email || '—'],
      ['Phone number', confirmed?.phone || formData.phone || '—'],
      ['Address', address],
      ['Class enrolled', confirmed?.className || selectedClass?.name || FREIGHT_BROKER_PROGRAM.defaultClassName],
      ['Attendance', (confirmed?.attendanceType || formData.attendanceType) === 'online' ? 'Online / Zoom' : 'In Person'],
    ]
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {header}
        {stepper}
        <Card sx={{ boxShadow: '0 20px 45px rgba(10,0,90,.08)', borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50', mb: 1.5 }} />
            <Typography variant="h5" component="h3" fontWeight={900} gutterBottom>Registration completed!</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Thank you, {firstName}! Your seat in the {FREIGHT_BROKER_PROGRAM.name} is confirmed.</Typography>
            <Box sx={{ bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 3, p: 2, mb: 3 }}>
              <Typography variant="overline" fontWeight={900} color="#2e7d32">Confirmed registration number</Typography>
              <Typography variant="h5" fontWeight={950} color="#1b5e20" sx={{ letterSpacing: '0.04em', wordBreak: 'break-all' }}>{regNo}</Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, textAlign: 'left', borderRadius: 3 }}>
              <Typography variant="subtitle2" fontWeight={900} gutterBottom>Registration & payment summary</Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack divider={<Divider sx={{ my: 0.75 }} />}>
                {summaryRows.map(([label, value]) => <Stack key={label} direction="row" justifyContent="space-between" gap={2} sx={{ py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} textAlign="right" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
                </Stack>)}
                <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 0.5 }}>
                  <Typography variant="body2" fontWeight={800}>Amount paid</Typography>
                  <Typography variant="body2" fontWeight={800} color="success.main">${total.toFixed(2)} USD (Stripe)</Typography>
                </Stack>
              </Stack>
            </Paper>
            <Alert severity="warning" icon={<PolicyIcon fontSize="small" />} sx={{ mb: 3, textAlign: 'left', bgcolor: '#fff9e6', color: '#3e2723', border: '1px solid #ffe082' }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom>Registration policy acknowledged</Typography>
              <Typography variant="body2">{FREIGHT_BROKER_POLICY_TEXT}</Typography>
              {(confirmed?.policySignature || paymentPolicySignature) && <Typography variant="caption" display="block" sx={{ mt: 1.5, fontStyle: 'italic' }}>
                Electronically signed by {confirmed?.policySignature || paymentPolicySignature}{confirmed?.policyAcceptedAt ? ` on ${new Date(confirmed.policyAcceptedAt).toLocaleString('en-US')}` : ''}
              </Typography>}
            </Alert>
            <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>A formal confirmation email has been sent to your inbox. Our team will contact you with course access and materials prior to start.</Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={1.5}>
              <Button variant="outlined" onClick={() => window.print()} startIcon={<PrintIcon />}>Print confirmation</Button>
              <Button variant="contained" color="secondary" onClick={() => { setState('idle'); setRegistration(null); setFormData(emptyForm); setVerification(null); setEmailVerified(false); setPhoneVerified(false); setEmailCode(''); setPhoneCode(''); setPaymentPolicyAccepted(false); setPaymentPolicySignature(''); scrollToSection() }}>Register another student</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (state === 'review' && registration) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {header}
        {stepper}
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, boxShadow: '0 12px 35px rgba(10,0,90,.06)', border: 1, borderColor: 'divider' }}>
          <Typography variant="h5" component="h3" fontWeight={900}>Review your registration</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Please verify your information and accept the required policy before proceeding to payment.</Typography>
          {paymentError && <Alert severity="error" sx={{ mb: 3 }}>{paymentError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <SectionHeading icon={<SchoolIcon color="secondary" fontSize="small" />} title="Selected class" />
                <Typography variant="body2" fontWeight={700}>{selectedClass?.name || FREIGHT_BROKER_PROGRAM.defaultClassName}</Typography>
                {selectedClass?.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{selectedClass.description}</Typography>}
                {selectedClass && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{sessionDates(selectedClass)}</Typography>}
                {selectedClass && (selectedClass.days_of_week || selectedClass.class_time) && <Typography variant="body2" color="text.secondary">{[selectedClass.days_of_week, selectedClass.class_time].filter(Boolean).join(' · ')}</Typography>}
                {selectedClass && <Typography variant="body2" color="text.secondary">{formData.attendanceType === 'online' ? 'Online / Zoom' : 'In Person'}</Typography>}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                  <Typography fontWeight={800} variant="body2">Tuition / total due</Typography>
                  <Typography variant="h6" fontWeight={950} color="secondary.main">${price.toFixed(2)}</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <SectionHeading icon={<PersonIcon color="secondary" fontSize="small" />} title="Registrant information" />
                <Stack spacing={0.5}>
                  <Typography variant="body2"><strong>Name:</strong> {formData.firstName} {formData.lastName}</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}><strong>Email:</strong> {formData.email}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {formData.phone || '—'}</Typography>
                  <Typography variant="body2"><strong>Attendance:</strong> {formData.attendanceType === 'online' ? 'Online / Zoom' : 'In Person'}</Typography>
                  <Typography variant="body2"><strong>Address:</strong> {formData.address1}{formData.address2 ? `, ${formData.address2}` : ''}</Typography>
                  <Typography variant="body2"><strong>City / state / ZIP:</strong> {formData.city}, {formData.state} {formData.zip}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}><strong>Registration number:</strong> {registration.registration_no}</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Stack spacing={2.5}>
            <PolicyAgreement firstName={formData.firstName} lastName={formData.lastName} accepted={paymentPolicyAccepted} signature={paymentPolicySignature} onAcceptedChange={setPaymentPolicyAccepted} onSignatureChange={setPaymentPolicySignature} />
            <Button
              variant="contained" color="secondary" size="large" fullWidth onClick={() => void handlePayment()}
              disabled={paymentLoading || !isPolicySigned(paymentPolicyAccepted, paymentPolicySignature, formData.firstName, formData.lastName)}
              sx={{ py: 1.75, fontSize: '1.05rem', fontWeight: 800 }}
              startIcon={paymentLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {paymentLoading ? 'Connecting to Stripe...' : `Proceed to Stripe Payment ($${price.toFixed(2)})`}
            </Button>
            <Button variant="outlined" fullWidth onClick={editRegistration} disabled={paymentLoading} startIcon={<EditIcon />}>Edit registration information</Button>
          </Stack>
        </Paper>
      </Box>
    )
  }

  const noSessions = !classesLoading && !classesError && !classes.some(isSessionSelectable)

  return (
    <Box>
      {header}
      {stepper}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 0, md: 1 } }}>
          <Typography component="h3" fontWeight={900} sx={{ mb: 1.5 }}>Upcoming sessions</Typography>
          {classesLoading && <Stack direction="row" gap={1.5} alignItems="center"><CircularProgress size={20} /><Typography color="text.secondary">Loading sessions…</Typography></Stack>}
          {classesError && <Alert severity="error">{classesError}</Alert>}
          {!classesLoading && !classesError && !classes.length && <Alert severity="info">No sessions are open right now. Please check back soon or contact us.</Alert>}
          <Stack spacing={2} role="radiogroup" aria-label="Upcoming sessions">
            {classes.map(c => <SessionCard key={c.id} c={c} selected={c.id === formData.classId} onSelect={() => selectClass(c.id)} />)}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 1, md: 0 } }} ref={formSectionRef}>
          <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, boxShadow: '0 12px 35px rgba(10,0,90,.06)', border: 1, borderColor: 'divider', scrollMarginTop: 110 }}>
            <Typography variant="h5" component="h3" fontWeight={900}>Register for the {FREIGHT_BROKER_PROGRAM.name}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>Complete the form below to reserve your seat. You'll review your information and policy agreement before paying.</Typography>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              {selectedClass?.description || 'Learn how to dispatch freight from start to finish: finding loads, carrier setup and paperwork, rate negotiation, compliance, and managing multiple trucks. Choose a session from the list to see its price.'}
            </Alert>
            {state === 'error' && <Alert severity="error" sx={{ mb: 3 }}><Stack direction="row" alignItems="center" gap={1}><ErrorIcon fontSize="small" />{paymentError || 'Unable to submit. Check the information and try again.'}</Stack></Alert>}
            {paymentError && state !== 'error' && <Alert severity="error" sx={{ mb: 3 }}>{paymentError}</Alert>}
            <form onSubmit={event => void submit(event)}>
              <Box component="input" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={event => setHoneypot(event.target.value)} sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
              <Stack spacing={2.5}>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                  <SectionHeading icon={<PersonIcon color="secondary" fontSize="small" />} title={phoneVerificationRequired ? 'Verify your contact information' : 'Verify your email address'} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: phoneVerificationRequired ? 6 : 12 }}><TextField fullWidth size="small" label="Email" type="email" autoComplete="email" value={formData.email} onChange={event => changeContact('email', event.target.value)} required disabled={contactVerified} /></Grid>
                    {phoneVerificationRequired && <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Phone (include country code)" type="tel" autoComplete="tel" value={formData.phone} onChange={event => changeContact('phone', event.target.value)} required disabled={contactVerified} /></Grid>}
                    {!verification && <Grid size={12}><Button fullWidth variant="outlined" onClick={() => void sendVerificationCodes()} disabled={verificationLoading || !formData.email || (phoneVerificationRequired && !formData.phone)}>{verificationLoading ? 'Sending code…' : phoneVerificationRequired ? 'Send email and SMS verification codes' : 'Send email verification code'}</Button></Grid>}
                    {verification && !contactVerified && <>
                      <Grid size={{ xs: 12, md: 6 }}><Stack spacing={1}><TextField fullWidth size="small" label="Email verification code" value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={emailVerified} inputProps={{ inputMode: 'numeric' }} /><Button variant="outlined" color={emailVerified ? 'success' : 'primary'} disabled={emailVerified || emailCode.length !== 6 || verificationLoading} onClick={() => void verifyCode('email')}>{emailVerified ? 'Email verified' : 'Verify email'}</Button><Button size="small" disabled={emailVerified || verificationLoading} onClick={() => void resendRegistrationCode(verification.id, 'email').catch(error => setPaymentError(error.message))}>Resend email code</Button></Stack></Grid>
                      {phoneVerificationRequired && <Grid size={{ xs: 12, md: 6 }}><Stack spacing={1}><TextField fullWidth size="small" label="SMS verification code" value={phoneCode} onChange={event => setPhoneCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={phoneVerified} inputProps={{ inputMode: 'numeric' }} /><Button variant="outlined" color={phoneVerified ? 'success' : 'primary'} disabled={phoneVerified || phoneCode.length !== 6 || verificationLoading} onClick={() => void verifyCode('phone')}>{phoneVerified ? 'Phone verified' : 'Verify phone'}</Button><Button size="small" disabled={phoneVerified || verificationLoading} onClick={() => void resendRegistrationCode(verification.id, 'phone').catch(error => setPaymentError(error.message))}>Resend SMS code</Button></Stack></Grid>}
                    </>}
                    {contactVerified && <Grid size={12}><Alert severity="success">{phoneVerificationRequired ? 'Email address and phone number verified.' : 'Email address verified.'}</Alert></Grid>}
                  </Grid>
                </Paper>
                {contactVerified && <>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                  <SectionHeading icon={<PersonIcon color="secondary" fontSize="small" />} title="Personal information" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="First name" autoComplete="given-name" value={formData.firstName} onChange={update('firstName')} required /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Last name" autoComplete="family-name" value={formData.lastName} onChange={update('lastName')} required /></Grid>
                    {!phoneVerificationRequired && <Grid size={12}><TextField fullWidth size="small" label="Phone (include country code)" type="tel" autoComplete="tel" value={formData.phone} onChange={event => changeContact('phone', event.target.value)} required /></Grid>}
                  </Grid>
                </Paper>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                  <SectionHeading icon={<HomeIcon color="secondary" fontSize="small" />} title="Mailing address" />
                  <Grid container spacing={2}>
                    <Grid size={12}><TextField fullWidth size="small" label="Address" autoComplete="address-line1" value={formData.address1} onChange={update('address1')} required /></Grid>
                    <Grid size={12}><TextField fullWidth size="small" label="Address line 2 (optional)" autoComplete="address-line2" value={formData.address2} onChange={update('address2')} /></Grid>
                    <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth size="small" label="City" autoComplete="address-level2" value={formData.city} onChange={update('city')} required /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><TextField fullWidth size="small" label="State" autoComplete="address-level1" value={formData.state} onChange={update('state')} required /></Grid>
                    <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth size="small" label="ZIP code" autoComplete="postal-code" value={formData.zip} onChange={update('zip')} required /></Grid>
                  </Grid>
                </Paper>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                  <SectionHeading icon={<SchoolIcon color="secondary" fontSize="small" />} title="Class selection" />
                  <FormControl fullWidth required size="small">
                    <InputLabel id="freight-broker-class-label">Freight Dispatch Masterclass session</InputLabel>
                    <Select labelId="freight-broker-class-label" value={classes.some(c => c.id === formData.classId) ? formData.classId : ''} onChange={event => setFormData(current => ({ ...current, classId: event.target.value }))} label="Freight Dispatch Masterclass session">
                      {classes.map(c => <MenuItem key={c.id} value={c.id} disabled={!isSessionSelectable(c)}>
                        {c.name} — ${dollars(c.price_cents).toFixed(2)}{!isSessionSelectable(c) ? ' (unavailable)' : ''}
                      </MenuItem>)}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Tip: pick a session from the "Upcoming sessions" list for full schedule and location details.</Typography>
                  <FormControl fullWidth required size="small" sx={{ mt: 2 }}>
                    <InputLabel id="attendance-type-label">How will you attend?</InputLabel>
                    <Select labelId="attendance-type-label" value={formData.attendanceType} onChange={event => setFormData(current => ({ ...current, attendanceType: event.target.value as 'online' | 'in_person' }))} label="How will you attend?">
                      <MenuItem value="online" disabled={!selectedClass?.allows_online}>Online / Zoom</MenuItem>
                      <MenuItem value="in_person" disabled={!selectedClass?.allows_in_person}>In Person</MenuItem>
                    </Select>
                  </FormControl>
                </Paper>
                <Button type="submit" variant="contained" color="secondary" size="large" fullWidth disabled={state === 'saving' || noSessions || classesLoading} sx={{ py: 1.75, fontSize: '1.05rem', fontWeight: 700 }}>
                  {state === 'saving' ? 'Saving Registration...' : 'Continue to Review & Policy Agreement'}
                </Button>
                </>}
              </Stack>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

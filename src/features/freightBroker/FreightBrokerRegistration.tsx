import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EditIcon from '@mui/icons-material/Edit'
import ErrorIcon from '@mui/icons-material/Error'
import PolicyIcon from '@mui/icons-material/Policy'
import PrintIcon from '@mui/icons-material/Print'
import { useLocation, useNavigate } from 'react-router-dom'
import { createBrokerRegistration, listBrokerClasses, startBrokerCheckout, type BrokerClass, type CreatedRegistration, type RegistrationDetails, type RegistrationForm } from './api'
import { PolicyAgreement } from './PolicyAgreement'
import { FREIGHT_BROKER_POLICY_TEXT, FREIGHT_BROKER_PROGRAM, isPolicySigned } from './program'
import { RegistrationPaymentStatus } from './RegistrationPaymentStatus'

// Freight Broker Masterclass registration, lifted from the Iman Trucking
// School DispatcherRegistration page (redesign branch) and embedded in the
// Freight Broker Masterclass page as the #register section.

const pendingRegistrationStorageKey = 'iman_freight_broker_pending_reg'
const emptyForm: RegistrationForm = { firstName: '', lastName: '', email: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', classId: '' }
const dollars = (cents?: number | null) => (cents ?? FREIGHT_BROKER_PROGRAM.defaultPriceCents) / 100
const mediumDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : null
const scrollToSection = () => window.setTimeout(() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

type Pending = { formData?: RegistrationForm; registration?: CreatedRegistration; paymentPolicyAccepted?: boolean; paymentPolicySignature?: string }
const readPending = (): Pending => { try { return JSON.parse(sessionStorage.getItem(pendingRegistrationStorageKey) || '{}') } catch { return {} } }
const writePending = (value: Pending) => { try { sessionStorage.setItem(pendingRegistrationStorageKey, JSON.stringify(value)) } catch { /* storage unavailable */ } }
const clearPending = () => { try { sessionStorage.removeItem(pendingRegistrationStorageKey) } catch { /* storage unavailable */ } }

export function FreightBrokerRegistration() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const paymentSessionId = searchParams.get('session_id')
  const paymentState = searchParams.get('payment') || ''

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

  // Restore the pending registration when returning from (or canceling) Stripe.
  useEffect(() => {
    const cached = readPending()
    if (cached.formData) setFormData(current => ({ ...current, ...cached.formData }))
    if (cached.registration) setRegistration(cached.registration)
    if (cached.paymentPolicyAccepted) setPaymentPolicyAccepted(true)
    if (cached.paymentPolicySignature) setPaymentPolicySignature(cached.paymentPolicySignature)
    if (paymentSessionId) scrollToSection()
  }, [paymentSessionId])

  useEffect(() => {
    listBrokerClasses()
      .then(data => setClasses(data))
      .catch(() => setClassesError('Class sessions could not be loaded. Please refresh the page to try again.'))
      .finally(() => setClassesLoading(false))
  }, [])

  // Keep the selected class valid for the loaded list (re-point, not just
  // default) so the registrant can never review one class and pay for another.
  useEffect(() => {
    if (classes.length > 0 && !classes.some(item => item.id === formData.classId)) {
      const firstSelectable = classes.find(item => !(item.seat_capacity != null && (item.seats_remaining ?? 0) <= 0)) ?? classes[0]
      setFormData(current => ({ ...current, classId: firstSelectable.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes])

  const selectedClass = classes.find(item => item.id === (formData.classId || registration?.class_id)) || classes[0]
  const price = dollars(selectedClass?.price_cents)
  const update = (field: keyof RegistrationForm) => (event: { target: { value: string } }) => setFormData(current => ({ ...current, [field]: event.target.value }))

  function clearReturnParams() {
    navigate(`${location.pathname}#register`, { replace: true })
    setShowStatus(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formData.classId) return setPaymentError('Please select a Freight Broker Masterclass session to continue.')
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

  if (state === 'success') {
    const regNo = confirmed?.registrationNo || registration?.registration_no || 'FBM-CONFIRMED'
    const firstName = confirmed?.firstName || formData.firstName || 'Student'
    const lastName = confirmed?.lastName || formData.lastName || ''
    const address = confirmed?.address
      ? `${confirmed.address}, ${confirmed.city}, ${confirmed.state} ${confirmed.zip}`
      : formData.address1 ? `${formData.address1}${formData.address2 ? `, ${formData.address2}` : ''}, ${formData.city}, ${formData.state} ${formData.zip}` : '—'
    // Prefer the amount Stripe actually charged over the client-side price.
    const total = paidAmountCents != null ? paidAmountCents / 100 : price
    const start = confirmed?.classStartsAt || selectedClass?.starts_at
    const end = confirmed?.classEndsAt || selectedClass?.ends_at
    const summary: [string, string | null | undefined][] = [
      ['Registrant', `${firstName} ${lastName}`],
      ['Email Address', confirmed?.email || formData.email || '—'],
      ['Phone Number', confirmed?.phone || formData.phone || '—'],
      ['Address', address],
      ['Class Enrolled', confirmed?.className || selectedClass?.name || FREIGHT_BROKER_PROGRAM.defaultClassName],
      ['Class Dates', start ? `${mediumDate(start)}${end ? ` – ${mediumDate(end)}` : ''}` : null],
      ['Location', confirmed?.classLocation || selectedClass?.location],
      ['Schedule', confirmed?.classScheduleNotes || selectedClass?.schedule_notes],
    ]
    return (
      <Card sx={{ maxWidth: 900, mx: 'auto', boxShadow: '0 25px 50px rgba(10,0,90,.15)', borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 3, md: 6 }, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: '#4caf50', mb: 2 }} />
          <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: 32, md: 44 } }}>Registration Completed!</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>Thank you, {firstName}! Your seat in the {FREIGHT_BROKER_PROGRAM.name} is confirmed.</Typography>
          <Box sx={{ bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 3, p: 2.5, mb: 4 }}>
            <Typography variant="overline" fontWeight={900} color="#2e7d32">Confirmed Registration Number</Typography>
            <Typography variant="h4" fontWeight={950} color="#1b5e20" sx={{ letterSpacing: '0.05em', wordBreak: 'break-all', fontSize: { xs: 22, md: 32 } }}>{regNo}</Typography>
          </Box>
          <Paper variant="outlined" sx={{ p: 3, mb: 4, textAlign: 'left', borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={900} gutterBottom>Registration & Payment Summary</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              {summary.filter(([, value]) => value).map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={700}>{value}</Typography>
              </Grid>)}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Amount Paid</Typography>
                <Typography variant="body2" fontWeight={800} color="success.main">${total.toFixed(2)} USD (Paid via Stripe)</Typography>
              </Grid>
            </Grid>
          </Paper>
          <Alert severity="warning" icon={<PolicyIcon />} sx={{ mb: 4, textAlign: 'left', bgcolor: '#fff9e6', color: '#3e2723', border: '1px solid #ffe082' }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>Registration Policy Acknowledged</Typography>
            <Typography variant="body2">{FREIGHT_BROKER_POLICY_TEXT}</Typography>
            {(confirmed?.policySignature || paymentPolicySignature) && <Typography variant="caption" display="block" sx={{ mt: 1.5, fontStyle: 'italic' }}>
              Electronically signed by {confirmed?.policySignature || paymentPolicySignature}
              {confirmed?.policyAcceptedAt ? ` on ${new Date(confirmed.policyAcceptedAt).toLocaleString('en-US')}` : ''}
            </Typography>}
          </Alert>
          <Alert severity="success" sx={{ mb: 4, textAlign: 'left' }}>A confirmation email has been sent to your inbox. Our team will contact you with class access and materials before your session begins.</Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={2}>
            <Button variant="outlined" size="large" onClick={() => window.print()} startIcon={<PrintIcon />}>Print Confirmation</Button>
            <Button variant="contained" color="secondary" size="large" onClick={() => { setState('idle'); setRegistration(null); setFormData(emptyForm); setPaymentPolicyAccepted(false); setPaymentPolicySignature('') }}>Register another student</Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const paperSx = { p: { xs: 3, md: 6 }, borderRadius: 4, boxShadow: '0 12px 35px rgba(10,0,90,.06)', border: 1, borderColor: 'divider' }

  if (state === 'review' && registration) {
    return (
      <Paper sx={paperSx}>
        <Typography variant="overline" fontWeight={900} letterSpacing=".12em" color="#8a5700">Step 2 of 2</Typography>
        <Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>Review your registration</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Please verify your information and accept the required policy before proceeding to payment.</Typography>
        {paymentError && <Alert severity="error" sx={{ mb: 3 }}>{paymentError}</Alert>}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography fontWeight={900} gutterBottom>Selected class</Typography>
              <Typography variant="body2"><strong>{selectedClass?.name || FREIGHT_BROKER_PROGRAM.defaultClassName}</strong></Typography>
              {selectedClass?.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{selectedClass.description}</Typography>}
              {selectedClass?.starts_at && <Typography variant="body2" sx={{ mt: 1 }}><strong>Dates:</strong> {mediumDate(selectedClass.starts_at)}{selectedClass.ends_at ? ` – ${mediumDate(selectedClass.ends_at)}` : ''}</Typography>}
              {selectedClass?.location && <Typography variant="body2"><strong>Location:</strong> {selectedClass.location}</Typography>}
              {selectedClass?.schedule_notes && <Typography variant="body2"><strong>Schedule:</strong> {selectedClass.schedule_notes}</Typography>}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                <Typography fontWeight={900}>Tuition / Total due</Typography>
                <Typography variant="h4" fontWeight={950} color="secondary.main">${price.toFixed(2)}</Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography fontWeight={900} gutterBottom>Registrant information</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Name:</strong> {formData.firstName} {formData.lastName}</Typography>
                <Typography variant="body2"><strong>Email:</strong> {formData.email}</Typography>
                <Typography variant="body2"><strong>Phone:</strong> {formData.phone || '—'}</Typography>
                <Typography variant="body2"><strong>Address:</strong> {formData.address1}{formData.address2 ? `, ${formData.address2}` : ''}</Typography>
                <Typography variant="body2"><strong>City / State / ZIP:</strong> {formData.city}, {formData.state} {formData.zip}</Typography>
                <Typography variant="body2" color="text.secondary"><strong>Registration number:</strong> {registration.registration_no}</Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
        <Divider sx={{ my: 4 }} />
        <Stack spacing={3}>
          <PolicyAgreement firstName={formData.firstName} lastName={formData.lastName} accepted={paymentPolicyAccepted} signature={paymentPolicySignature} onAcceptedChange={setPaymentPolicyAccepted} onSignatureChange={setPaymentPolicySignature} />
          <Button
            variant="contained" color="secondary" size="large" fullWidth onClick={() => void handlePayment()}
            disabled={paymentLoading || !isPolicySigned(paymentPolicyAccepted, paymentPolicySignature, formData.firstName, formData.lastName)}
            sx={{ py: 2, fontSize: '1.1rem', fontWeight: 800 }}
            startIcon={paymentLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {paymentLoading ? 'Connecting to Stripe...' : `Proceed to Stripe Payment ($${price.toFixed(2)})`}
          </Button>
          <Button variant="outlined" size="large" fullWidth onClick={editRegistration} disabled={paymentLoading} sx={{ py: 1.5 }} startIcon={<EditIcon />}>Edit registration information</Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper sx={paperSx}>
      <Typography variant="overline" fontWeight={900} letterSpacing=".12em" color="#8a5700">Step 1 of 2</Typography>
      <Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>Register for the {FREIGHT_BROKER_PROGRAM.name}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Complete the form below to reserve your seat. You will review your information and the policy agreement before paying.</Typography>
      <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
        Learn how freight brokerage works end to end: authority and compliance, finding shippers, carrier sourcing, pricing and negotiation, and daily operations. Tuition is ${price.toFixed(2)}.
      </Alert>
      {state === 'error' && <Alert severity="error" sx={{ mb: 3 }}><Stack direction="row" alignItems="center" gap={1}><ErrorIcon fontSize="small" />{paymentError || 'Unable to submit. Check the information and try again.'}</Stack></Alert>}
      {paymentError && state !== 'error' && <Alert severity="error" sx={{ mb: 3 }}>{paymentError}</Alert>}
      <form onSubmit={event => void submit(event)}>
        <Box component="input" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={event => setHoneypot(event.target.value)} sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="First name" autoComplete="given-name" value={formData.firstName} onChange={update('firstName')} required /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Last name" autoComplete="family-name" value={formData.lastName} onChange={update('lastName')} required /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Email" type="email" autoComplete="email" value={formData.email} onChange={update('email')} required /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Phone" type="tel" autoComplete="tel" value={formData.phone} onChange={update('phone')} helperText="Optional. Used for a text confirmation." /></Grid>
          <Grid size={12}><TextField fullWidth label="Address" autoComplete="address-line1" value={formData.address1} onChange={update('address1')} required /></Grid>
          <Grid size={12}><TextField fullWidth label="Address line 2 (optional)" autoComplete="address-line2" value={formData.address2} onChange={update('address2')} /></Grid>
          <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="City" autoComplete="address-level2" value={formData.city} onChange={update('city')} required /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><TextField fullWidth label="State" autoComplete="address-level1" value={formData.state} onChange={update('state')} required /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth label="ZIP code" autoComplete="postal-code" value={formData.zip} onChange={update('zip')} required /></Grid>
          <Grid size={12}>
            <Typography fontWeight={900} sx={{ mb: 1.5 }}>Select a class session</Typography>
            {classesLoading && <Stack direction="row" gap={1.5} alignItems="center"><CircularProgress size={20} /><Typography color="text.secondary">Loading class sessions…</Typography></Stack>}
            {classesError && <Alert severity="error">{classesError}</Alert>}
            {!classesLoading && !classesError && !classes.length && <Alert severity="info">There are no open Freight Broker Masterclass sessions right now. Please check back soon or contact us.</Alert>}
            <Stack spacing={2} role="radiogroup" aria-label="Select a class session">
              {classes.map(item => {
                const isFull = item.seat_capacity != null && (item.seats_remaining ?? 0) <= 0
                const isSelected = formData.classId === item.id
                const startLabel = mediumDate(item.starts_at) || 'Rolling enrollment'
                const endLabel = mediumDate(item.ends_at)
                const selectClass = () => { if (!isFull) setFormData(current => ({ ...current, classId: item.id })) }
                return <Paper
                  key={item.id} variant="outlined" role="radio" aria-checked={isSelected} aria-disabled={isFull} tabIndex={isFull ? -1 : 0}
                  onClick={selectClass}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectClass() } }}
                  sx={{ p: 2.5, borderRadius: 3, cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.55 : 1, borderColor: isSelected ? 'secondary.main' : 'divider', borderWidth: isSelected ? 2 : 1, bgcolor: isSelected ? 'action.selected' : 'transparent', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main' } }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
                    <Box>
                      <Typography fontWeight={900}>{item.name}</Typography>
                      {item.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>}
                      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                        <Chip size="small" label={endLabel ? `${startLabel} – ${endLabel}` : startLabel} />
                        {item.location && <Chip size="small" label={item.location} />}
                        {item.schedule_notes && <Chip size="small" label={item.schedule_notes} sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: .5 } }} />}
                        {item.seat_capacity != null && <Chip size="small" color={isFull ? 'error' : 'success'} label={isFull ? 'Class full' : `${item.seats_remaining} seat${item.seats_remaining === 1 ? '' : 's'} left`} />}
                      </Stack>
                    </Box>
                    <Typography variant="h6" fontWeight={950} color="secondary.main" whiteSpace="nowrap">${dollars(item.price_cents).toFixed(2)}</Typography>
                  </Stack>
                </Paper>
              })}
            </Stack>
          </Grid>
          <Grid size={12}>
            <Button type="submit" variant="contained" color="secondary" size="large" fullWidth disabled={state === 'saving' || !classes.length} sx={{ py: 2, fontSize: '1.05rem', fontWeight: 700 }}>
              {state === 'saving' ? 'Saving Registration...' : 'Continue to Review & Policy Agreement'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  )
}

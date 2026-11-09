import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Checkbox, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Tooltip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import GroupsIcon from '@mui/icons-material/Groups'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Seo } from '../../components/common/Seo'
import { useAuth } from '../../contexts/AuthContext'
import { RecordsPage, StatusChip } from '../../features/backoffice/RecordsPage'
import { brokerClassStatuses, deleteBrokerClass, recordRegistrationPayment, resendRegistrationConfirmation, transferRegistration, formatDate, formatDateTime, formatMoney, listBrokerClassesAdmin, registrationNotifications, registrationPaymentReminders, retryRegistrationPaymentReminder, saveBrokerClass, type BrokerClassRow, type NotificationRow, type PaymentReminderState, type RecordRow } from '../../services/backoffice'
import { MASTERCLASS_PROGRAMS, type MasterclassProgramId } from '../../features/freightBroker/program'
import { deliveryStatuses, masterclassRegistrationsConfig, notificationLogConfig, notificationStatuses, paymentMethods, reminderStatuses } from './backOfficeConfigs'

function RegistrationNotifications({ id }: { id: string }) {
  const [rows, setRows] = useState<NotificationRow[] | null>(null)
  useEffect(() => { registrationNotifications(id).then(setRows).catch(() => setRows([])) }, [id])
  if (!rows) return null
  return <Box mt={3}>
    <Typography fontWeight={900} mb={1}>Notifications</Typography>
    {!rows.length && <Typography variant="body2" color="text.secondary">None yet. Emails and a text message are sent when the payment is confirmed.</Typography>}
    <Stack spacing={1}>{rows.map(row => <Box key={row.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" fontWeight={800}>{row.channel.toUpperCase()} · {row.recipient || '—'}</Typography><StatusChip value={row.status} options={notificationStatuses} /></Stack>
      <Typography variant="body2" mt={.5}>{row.subject || row.template}</Typography>
      <Typography variant="caption" color="text.secondary">{formatDateTime(row.created_at)}{row.error ? ` · ${row.error}` : ''}</Typography>
    </Box>)}</Stack>
  </Box>
}

const reminderSendStatuses = [
  { value: 'accepted', label: 'Accepted by Twilio', color: 'success' as const },
  { value: 'sending', label: 'Sending', color: 'info' as const },
  { value: 'retrying', label: 'Retrying', color: 'warning' as const },
  { value: 'failed', label: 'Failed', color: 'error' as const },
  { value: 'canceled', label: 'Canceled' },
]

function PaymentReminders({ id }: { id: string }) {
  const [state, setState] = useState<PaymentReminderState | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const load = () => registrationPaymentReminders(id).then(setState).catch(() => setState({ schedule: null, reminders: [], optOut: null }))
  useEffect(() => { void load() }, [id])
  if (!state) return null
  const { schedule, reminders, optOut } = state
  const canRetry = schedule?.status === 'scheduled' && reminders[0]?.status === 'failed'
  const retryNow = async () => {
    setRetrying(true)
    setRetryError('')
    try {
      await retryRegistrationPaymentReminder(id)
      await load()
    } catch (caught) {
      setRetryError(caught instanceof Error ? caught.message : 'Unable to queue the reminder retry.')
    } finally {
      setRetrying(false)
    }
  }
  return <Box mt={3}>
    <Typography fontWeight={900} mb={1}>SMS payment reminders</Typography>
    {!schedule && <Typography variant="body2" color="text.secondary">Not scheduled. Reminders go only to students who opted in to texts on the registration form.</Typography>}
    {schedule && <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" fontWeight={800}>{schedule.reminder_count} sent</Typography><StatusChip value={schedule.status} options={reminderStatuses} /></Stack>
      <Typography variant="caption" color="text.secondary" display="block">Last sent: {formatDateTime(schedule.last_sent_at)} · Next: {formatDateTime(schedule.next_reminder_at)}</Typography>
      {schedule.last_error && <Typography variant="caption" color="error" display="block">{schedule.last_error}</Typography>}
      {canRetry && <Button size="small" sx={{ mt: 1 }} disabled={retrying} onClick={() => void retryNow()}>{retrying ? 'Queuing…' : 'Retry after fixing Twilio'}</Button>}
      {retryError && <Alert severity="error" sx={{ mt: 1 }}>{retryError}</Alert>}
    </Box>}
    {optOut && <Alert severity={optOut.opted_out ? 'warning' : 'info'} sx={{ mt: 1 }}>{optOut.opted_out ? `This number opted out of texts ${formatDateTime(optOut.opted_out_at)}${optOut.keyword ? ` (replied "${optOut.keyword}")` : ''}.` : `This number opted back in ${formatDateTime(optOut.opted_in_at)}.`}</Alert>}
    <Stack spacing={1} mt={1}>{reminders.map(row => <Box key={row.id} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
        <Typography variant="body2" fontWeight={800}>Reminder #{row.attempt_number} · {row.phone}</Typography>
        <Stack direction="row" spacing={.5}><StatusChip value={row.status} options={reminderSendStatuses} />{row.delivery_status && <StatusChip value={row.delivery_status} options={deliveryStatuses} />}</Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">{formatDateTime(row.sent_at ?? row.created_at)}{row.send_attempts > 1 ? ` · ${row.send_attempts} tries` : ''}{row.twilio_message_sid ? ` · ${row.twilio_message_sid}` : ''}{row.next_retry_at ? ` · retry ${formatDateTime(row.next_retry_at)}` : ''}</Typography>
      {row.error_message && <Typography variant="caption" color="error" display="block">{row.error_code ? `${row.error_code}: ` : ''}{row.error_message}</Typography>}
    </Box>)}</Stack>
  </Box>
}

const sessionLabel = (c: BrokerClassRow) => `${c.name} · ${formatDate(c.starts_at)}${c.status !== 'OPEN' ? ` (${c.status})` : ''}`

// Staff actions for one registration: move to another session, record a
// payment received outside Stripe, and resend the confirmation email.
function RegistrationActions({ row, sessions, onChanged }: { row: RecordRow; sessions: BrokerClassRow[]; onChanged: () => void }) {
  const id = String(row.id)
  const paid = row.payment_status === 'paid'
  const canceled = row.status === 'CANCELED'
  const currentClass = sessions.find(c => c.id === row.class_id)
  const [dialog, setDialog] = useState<'move' | 'payment' | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [move, setMove] = useState({ classId: '', allowFull: false, note: '' })
  const [payment, setPayment] = useState({ method: 'zelle', amount: '', reference: '', note: '', sendConfirmation: true })

  const run = async (action: () => Promise<string>) => {
    setBusy(true); setError(''); setMessage('')
    try { setMessage(await action()); setDialog(null); onChanged() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.') }
    finally { setBusy(false) }
  }
  const openPayment = () => { setPayment({ method: 'zelle', amount: currentClass ? (currentClass.price_cents / 100).toFixed(2) : '', reference: '', note: '', sendConfirmation: true }); setError(''); setDialog('payment') }
  const savePayment = () => {
    const cents = Math.round(Number(payment.amount) * 100)
    if (!Number.isFinite(cents) || cents <= 0) return setError('Enter the amount received.')
    void run(async () => {
      const result = await recordRegistrationPayment(id, { method: payment.method, amount_cents: cents, provider_reference: payment.reference, note: payment.note, sendConfirmation: payment.sendConfirmation })
      return result.notificationError ? `Payment recorded and the registration is confirmed, but the confirmation had a problem: ${result.notificationError}` : `Payment recorded and the registration is confirmed.${payment.sendConfirmation ? ' The confirmation email was sent.' : ''}`
    })
  }
  const targets = sessions.filter(c => c.id !== row.class_id)

  return <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 3 }}>
    <Typography fontWeight={900} mb={1.5}>Staff actions</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Button variant="outlined" size="small" disabled={canceled || busy} onClick={() => { setMove({ classId: '', allowFull: false, note: '' }); setError(''); setDialog('move') }}>Move to another session</Button>
      {!paid && <Button variant="outlined" size="small" color="success" disabled={canceled || busy} onClick={openPayment}>Record offline payment</Button>}
      {paid && <Button variant="outlined" size="small" disabled={busy} onClick={() => void run(async () => { await resendRegistrationConfirmation(id); return 'Confirmation email sent again.' })}>{busy ? 'Sending…' : 'Resend confirmation email'}</Button>}
    </Stack>
    {canceled && <Typography variant="caption" color="text.secondary" display="block" mt={1}>Set the status back to Submitted or Confirmed to move this student or record a payment.</Typography>}
    {paid && <Typography variant="caption" color="text.secondary" display="block" mt={1}>Refunds for card payments are issued in the Stripe Dashboard. Offline payments can be marked refunded on the Payments page.</Typography>}
    {message && <Alert severity="success" sx={{ mt: 1.5 }} onClose={() => setMessage('')}>{message}</Alert>}
    {error && !dialog && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}

    <Dialog open={dialog === 'move'} onClose={() => !busy && setDialog(null)} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={900}>Move to another session</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">Current session: {currentClass ? sessionLabel(currentClass) : String((row.class as { name?: string } | null)?.name ?? 'none')}. The payment, if any, moves with the student.</Typography>
          <TextField select label="New session" value={move.classId} onChange={event => setMove(current => ({ ...current, classId: event.target.value }))} required>
            {!targets.length && <MenuItem value="" disabled>No other sessions. Create one on the Classes page first.</MenuItem>}
            {targets.map(c => <MenuItem key={c.id} value={c.id}>{sessionLabel(c)} · {c.seat_capacity == null ? 'unlimited seats' : `${c.seats_remaining} seat${c.seats_remaining === 1 ? '' : 's'} left`}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Checkbox checked={move.allowFull} onChange={event => setMove(current => ({ ...current, allowFull: event.target.checked }))} />} label="Move even if the session is full" />
          <TextField label="Reason (saved in the internal notes)" value={move.note} onChange={event => setMove(current => ({ ...current, note: event.target.value }))} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
        <Button variant="contained" disabled={busy || !move.classId} onClick={() => void run(async () => { await transferRegistration(id, move); return 'Student moved to the new session.' })}>{busy ? 'Moving…' : 'Move student'}</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={dialog === 'payment'} onClose={() => !busy && setDialog(null)} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={900}>Record offline payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">For money received outside the website (cash, check, Zelle…). The registration becomes Confirmed and its seat is counted.</Typography>
          <TextField select label="Method" value={payment.method} onChange={event => setPayment(current => ({ ...current, method: event.target.value }))}>
            {paymentMethods.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField label="Amount received (USD)" type="number" value={payment.amount} onChange={event => setPayment(current => ({ ...current, amount: event.target.value }))} slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }} required />
          <TextField label="Reference (check number, Zelle confirmation…)" value={payment.reference} onChange={event => setPayment(current => ({ ...current, reference: event.target.value }))} />
          <TextField label="Note" value={payment.note} onChange={event => setPayment(current => ({ ...current, note: event.target.value }))} multiline minRows={2} />
          <FormControlLabel control={<Checkbox checked={payment.sendConfirmation} onChange={event => setPayment(current => ({ ...current, sendConfirmation: event.target.checked }))} />} label="Email the student their confirmation, calendar invite and signed agreement" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="success" disabled={busy} onClick={savePayment}>{busy ? 'Saving…' : 'Record payment'}</Button>
      </DialogActions>
    </Dialog>
  </Paper>
}

export function BrokerRegistrationsPage({ program = 'dispatch_masterclass' }: { program?: MasterclassProgramId }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''
  const [sessions, setSessions] = useState<BrokerClassRow[]>([])
  useEffect(() => { listBrokerClassesAdmin(program).then(setSessions).catch(() => setSessions([])) }, [program])
  const config = useMemo(() => {
    const base = masterclassRegistrationsConfig(MASTERCLASS_PROGRAMS[program])
    const session = sessions.find(c => c.id === sessionId)
    return {
      ...base,
      fixedFilters: { ...base.fixedFilters, ...(sessionId ? { class_id: sessionId } : {}) },
      subtitle: session ? `Students registered for ${session.name} (${formatDate(session.starts_at)} – ${formatDate(session.ends_at)}).` : base.subtitle,
      csvName: session ? `${base.csvName}-${session.starts_at.slice(0, 10)}` : base.csvName,
      headerAction: () => <TextField select size="small" label="Session" value={sessions.some(c => c.id === sessionId) ? sessionId : ''} onChange={event => setSearchParams(event.target.value ? { session: event.target.value } : {})} sx={{ minWidth: 260 }}>
        <MenuItem value="">All sessions</MenuItem>
        {sessions.map(c => <MenuItem key={c.id} value={c.id}>{sessionLabel(c)}</MenuItem>)}
      </TextField>,
      renderDetail: (row: RecordRow, reload: () => void) => <>
        <RegistrationActions row={row} sessions={sessions} onChanged={reload} />
        <PaymentReminders id={String(row.id)} />
        <RegistrationNotifications id={String(row.id)} />
      </>,
    }
  }, [program, sessionId, sessions, setSearchParams])
  // key: switching boards or sessions remounts the page so search, filters and paging reset.
  return <RecordsPage key={`${program}:${sessionId}`} {...config} />
}
export function NotificationsPage() { return <RecordsPage {...notificationLogConfig} /> }

// ---------------------------------------------------------------------------
// Class sessions (adapted from the school's DispatcherClasses admin page)
// ---------------------------------------------------------------------------

type ClassForm = { id: string | null; name: string; description: string; priceDollars: string; startsAt: string; endsAt: string; deadline: string; daysOfWeek: string; classTime: string; deliveryMode: 'online' | 'in_person'; location: string; instructor: string; seatCapacity: string; status: BrokerClassRow['status']; timezone: string; allowsOnline: boolean; allowsInPerson: boolean; zoomJoinUrl: string; onlineInstructions: string; physicalLocation: string; inPersonInstructions: string }
const emptyForm: ClassForm = { id: null, name: '', description: '', priceDollars: '520', startsAt: '', endsAt: '', deadline: '', daysOfWeek: '', classTime: '', deliveryMode: 'online', location: '', instructor: '', seatCapacity: '', status: 'OPEN', timezone: 'America/New_York', allowsOnline: true, allowsInPerson: false, zoomJoinUrl: '', onlineInstructions: '', physicalLocation: '', inPersonInstructions: '' }
const statusColor = (status: string) => status === 'OPEN' ? 'success' : status === 'FULL' ? 'warning' : status === 'COMPLETED' ? 'info' : 'default'

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function BrokerClassesPage({ program: programId = 'dispatch_masterclass' }: { program?: MasterclassProgramId }) {
  const program = MASTERCLASS_PROGRAMS[programId]
  const { profile } = useAuth()
  const [rows, setRows] = useState<BrokerClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ClassForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await listBrokerClassesAdmin(programId))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load class sessions.')
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDialogOpen(false); setNotice(''); void load() }, [programId])

  const openCreate = () => { setForm(emptyForm); setFormError(''); setDialogOpen(true) }
  const openEdit = (row: BrokerClassRow) => {
    setForm({ id: row.id, name: row.name, description: row.description ?? '', priceDollars: (row.price_cents / 100).toFixed(2), startsAt: toDatetimeLocal(row.starts_at), endsAt: toDatetimeLocal(row.ends_at), deadline: row.registration_deadline ? toDatetimeLocal(row.registration_deadline) : '', daysOfWeek: row.days_of_week ?? '', classTime: row.class_time ?? '', deliveryMode: row.delivery_mode ?? 'online', location: row.location ?? '', instructor: row.instructor_name ?? '', seatCapacity: row.seat_capacity == null ? '' : String(row.seat_capacity), status: row.status, timezone: row.timezone || 'America/New_York', allowsOnline: row.allows_online, allowsInPerson: row.allows_in_person, zoomJoinUrl: row.zoom_join_url ?? '', onlineInstructions: row.online_instructions ?? '', physicalLocation: row.physical_location ?? '', inPersonInstructions: row.in_person_instructions ?? '' })
    setFormError('')
    setDialogOpen(true)
  }
  // Copy a session's details into a new one; staff then set the new dates.
  const openDuplicate = (row: BrokerClassRow) => {
    openEdit(row)
    setForm(current => ({ ...current, id: null, name: `${row.name} (copy)`, startsAt: '', endsAt: '', deadline: '', status: 'OPEN' }))
  }
  const update = (key: keyof ClassForm, value: string) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    const price = Number(form.priceDollars)
    if (!form.name.trim() || !form.startsAt || !form.endsAt) return setFormError('Name, start, and end are required.')
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return setFormError('The end must be after the start.')
    if (form.deadline && new Date(form.deadline) > new Date(form.endsAt)) return setFormError('The registration deadline must be before the session ends.')
    if (!Number.isFinite(price) || price <= 0) return setFormError('Enter a price greater than zero.')
    if (!form.allowsOnline && !form.allowsInPerson) return setFormError('Enable Online / Zoom, In Person, or both.')
    if (form.seatCapacity && (!Number.isInteger(Number(form.seatCapacity)) || Number(form.seatCapacity) < 0)) return setFormError('Seat capacity must be a whole number, or blank for unlimited.')
    setSaving(true)
    setFormError('')
    try {
      await saveBrokerClass({
        program: programId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_cents: Math.round(price * 100),
        starts_at: new Date(form.startsAt).toISOString(),
        ends_at: new Date(form.endsAt).toISOString(),
        registration_deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        days_of_week: form.daysOfWeek.trim() || null,
        class_time: form.classTime.trim() || null,
        delivery_mode: form.allowsOnline ? 'online' : 'in_person',
        location: form.location.trim() || null,
        timezone: form.timezone.trim(), allows_online: form.allowsOnline, allows_in_person: form.allowsInPerson,
        zoom_join_url: form.zoomJoinUrl.trim() || null, online_instructions: form.onlineInstructions.trim(),
        physical_location: form.physicalLocation.trim() || null, in_person_instructions: form.inPersonInstructions.trim(),
        instructor_name: form.instructor.trim() || null,
        seat_capacity: form.seatCapacity === '' ? null : Number(form.seatCapacity),
        status: form.status,
      }, form.id ?? undefined)
      setDialogOpen(false)
      setNotice(form.id ? 'Class session updated.' : 'Class session created.')
      await load()
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to save the class session.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: BrokerClassRow) => {
    if (!window.confirm(`Delete “${row.name}”? Registrations keep their data but lose the class link.`)) return
    try {
      await deleteBrokerClass(row.id)
      setNotice('Class session deleted.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete the class session.')
    }
  }

  return <>
    <Seo title={`${program.shortName} Classes | Iman Logistics Back Office`} canonical={`${program.adminPath}classes/`} />
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} spacing={2} mb={3}>
        <Box><Typography component="h1" variant="h4" fontWeight={950}>{program.shortName} class sessions</Typography><Typography color="text.secondary" mt={.5}>OPEN sessions appear under "Upcoming sessions" on the {program.name} page. Seats are counted from paid registrations. Use Students to see everyone registered for a session.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New class session</Button>
      </Stack>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{['Session', 'Dates', 'Schedule', 'Price', 'Delivery', 'Seats', 'Status', ''].map(label => <TableCell key={label} sx={{ fontWeight: 900, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map(row => <TableRow key={row.id} hover>
                <TableCell sx={{ py: 1.5, minWidth: 180 }}><Typography variant="body2" fontWeight={800}>{row.name}</Typography>{row.instructor_name && <Typography variant="caption" color="text.secondary">Instructor: {row.instructor_name}</Typography>}</TableCell>
                <TableCell sx={{ minWidth: 130 }}>{formatDate(row.starts_at)} –<br />{formatDate(row.ends_at)}{row.registration_deadline && <Typography variant="caption" display="block" color="warning.dark">Register by {formatDate(row.registration_deadline)}</Typography>}</TableCell>
                <TableCell>{[row.days_of_week, row.class_time].filter(Boolean).join(' · ') || '—'}</TableCell>
                <TableCell>{formatMoney(row.price_cents)}</TableCell>
                <TableCell>{[row.allows_online && 'Online', row.allows_in_person && 'In person'].filter(Boolean).join(' / ')}</TableCell>
                <TableCell sx={{ minWidth: 90 }}>{row.seat_capacity == null ? `${row.seats_taken} paid` : `${row.seats_taken} / ${row.seat_capacity} paid`}<Typography variant="caption" display="block" color="text.secondary">{row.seat_capacity == null ? 'Unlimited seats' : `${row.seats_remaining} left`}</Typography></TableCell>
                <TableCell><Chip size="small" label={row.status} color={statusColor(row.status)} sx={{ fontWeight: 800 }} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" variant="outlined" startIcon={<GroupsIcon />} component={RouterLink} to={`${program.adminPath}?session=${row.id}`} sx={{ mr: .5 }}>Students</Button>
                  <Tooltip title="Edit session"><IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Duplicate with new dates"><IconButton size="small" aria-label={`Duplicate ${row.name}`} onClick={() => openDuplicate(row)}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                  {profile?.role === 'super_admin' && <Tooltip title="Delete session"><IconButton size="small" color="error" aria-label={`Delete ${row.name}`} onClick={() => void remove(row)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>)}
              {!rows.length && <TableRow><TableCell colSpan={8} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>{loading ? 'Loading…' : 'No class sessions yet.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>

    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={900}>{form.id ? 'Edit class session' : 'New class session'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Session name" value={form.name} onChange={event => update('name', event.target.value)} required />
          <TextField label="Description" value={form.description} onChange={event => update('description', event.target.value)} multiline minRows={2} />
          <TextField label="Price (USD)" type="number" value={form.priceDollars} onChange={event => update('priceDollars', event.target.value)} slotProps={{ htmlInput: { min: 1, step: '0.01' } }} required helperText="This exact amount is charged at checkout." />
          <TextField label="Start date/time" type="datetime-local" value={form.startsAt} onChange={event => update('startsAt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="End date/time" type="datetime-local" value={form.endsAt} onChange={event => update('endsAt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="Registration deadline (optional)" type="datetime-local" value={form.deadline} onChange={event => update('deadline', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Days of week" value={form.daysOfWeek} onChange={event => update('daysOfWeek', event.target.value)} placeholder="Mon, Wed, Fri" />
          <TextField label="Class time" value={form.classTime} onChange={event => update('classTime', event.target.value)} placeholder="6:00 PM – 9:00 PM ET" />
          <TextField label="Timezone" value={form.timezone} onChange={event => update('timezone', event.target.value)} placeholder="America/New_York" required />
          <Stack direction={{ xs: 'column', sm: 'row' }}><FormControlLabel control={<Checkbox checked={form.allowsOnline} onChange={event => setForm(current => ({ ...current, allowsOnline: event.target.checked }))} />} label="Online / Zoom" /><FormControlLabel control={<Checkbox checked={form.allowsInPerson} onChange={event => setForm(current => ({ ...current, allowsInPerson: event.target.checked }))} />} label="In Person" /></Stack>
          {form.allowsOnline && <><TextField label="Private Zoom join URL" type="url" value={form.zoomJoinUrl} onChange={event => update('zoomJoinUrl', event.target.value)} helperText="Shown only after confirmed payment." /><TextField label="Online instructions" value={form.onlineInstructions} onChange={event => update('onlineInstructions', event.target.value)} multiline minRows={2} /></>}
          {form.allowsInPerson && <><TextField label="Physical class location" value={form.physicalLocation} onChange={event => update('physicalLocation', event.target.value)} /><TextField label="In-person instructions" value={form.inPersonInstructions} onChange={event => update('inPersonInstructions', event.target.value)} multiline minRows={2} /></>}
          <TextField label="Public location summary" value={form.location} onChange={event => update('location', event.target.value)} placeholder="Online or city/campus name" />
          <TextField label="Instructor" value={form.instructor} onChange={event => update('instructor', event.target.value)} />
          <TextField label="Seat capacity (blank = unlimited)" type="number" value={form.seatCapacity} onChange={event => update('seatCapacity', event.target.value)} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
          <TextField select label="Status" value={form.status} onChange={event => update('status', event.target.value)} helperText="Only OPEN sessions are shown and accept registrations.">{brokerClassStatuses.map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save class session'}</Button>
      </DialogActions>
    </Dialog>
  </>
}

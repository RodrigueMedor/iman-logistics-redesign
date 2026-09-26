import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { Seo } from '../../components/common/Seo'
import { useAuth } from '../../contexts/AuthContext'
import { RecordsPage, StatusChip } from '../../features/backoffice/RecordsPage'
import { deleteBrokerClass, formatDate, formatDateTime, formatMoney, listBrokerClassesAdmin, registrationNotifications, saveBrokerClass, type BrokerClassRow, type NotificationRow, type RecordRow } from '../../services/backoffice'
import { brokerRegistrationsConfig, notificationLogConfig, notificationStatuses } from './backOfficeConfigs'

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

const registrationsPageConfig = { ...brokerRegistrationsConfig, renderDetail: (row: RecordRow) => <RegistrationNotifications id={String(row.id)} /> }
export function BrokerRegistrationsPage() { return <RecordsPage {...registrationsPageConfig} /> }
export function NotificationsPage() { return <RecordsPage {...notificationLogConfig} /> }

// ---------------------------------------------------------------------------
// Class sessions (adapted from the school's DispatcherClasses admin page)
// ---------------------------------------------------------------------------

type ClassForm = { id: string | null; name: string; description: string; priceDollars: string; startsAt: string; endsAt: string; location: string; scheduleNotes: string; seatCapacity: string; open: boolean }
const emptyForm: ClassForm = { id: null, name: '', description: '', priceDollars: '520', startsAt: '', endsAt: '', location: '', scheduleNotes: '', seatCapacity: '', open: true }

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function BrokerClassesPage() {
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
      setRows(await listBrokerClassesAdmin())
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load class sessions.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const openCreate = () => { setForm(emptyForm); setFormError(''); setDialogOpen(true) }
  const openEdit = (row: BrokerClassRow) => {
    setForm({ id: row.id, name: row.name, description: row.description ?? '', priceDollars: (row.price_cents / 100).toFixed(2), startsAt: toDatetimeLocal(row.starts_at), endsAt: toDatetimeLocal(row.ends_at), location: row.location ?? '', scheduleNotes: row.schedule_notes ?? '', seatCapacity: row.seat_capacity == null ? '' : String(row.seat_capacity), open: row.open })
    setFormError('')
    setDialogOpen(true)
  }
  const update = (key: keyof ClassForm, value: string | boolean) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    const price = Number(form.priceDollars)
    if (!form.name.trim() || !form.startsAt || !form.endsAt) return setFormError('Name, start, and end are required.')
    if (!Number.isFinite(price) || price <= 0) return setFormError('Enter a price greater than zero.')
    if (form.seatCapacity && (!Number.isInteger(Number(form.seatCapacity)) || Number(form.seatCapacity) < 0)) return setFormError('Seat capacity must be a whole number, or blank for unlimited.')
    setSaving(true)
    setFormError('')
    try {
      await saveBrokerClass({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_cents: Math.round(price * 100),
        starts_at: new Date(form.startsAt).toISOString(),
        ends_at: new Date(form.endsAt).toISOString(),
        location: form.location.trim() || null,
        schedule_notes: form.scheduleNotes.trim() || null,
        seat_capacity: form.seatCapacity === '' ? null : Number(form.seatCapacity),
        open: form.open,
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
    <Seo title="Freight Broker Classes | Iman Logistics Back Office" canonical="/admin/freight-broker/classes/" />
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} spacing={2} mb={3}>
        <Box><Typography component="h1" variant="h4" fontWeight={950}>Freight Broker class sessions</Typography><Typography color="text.secondary" mt={.5}>Dates, price, location, and seats shown on the Freight Broker Masterclass page. Seats are counted from paid registrations.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New class session</Button>
      </Stack>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{['Class', 'Dates', 'Price', 'Location', 'Seats', 'Status', ''].map(label => <TableCell key={label} sx={{ fontWeight: 900, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map(row => <TableRow key={row.id} hover>
                <TableCell sx={{ py: 1.5 }}><Typography variant="body2" fontWeight={800}>{row.name}</Typography>{row.schedule_notes && <Typography variant="caption" color="text.secondary">{row.schedule_notes}</Typography>}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.starts_at)} – {formatDate(row.ends_at)}</TableCell>
                <TableCell>{formatMoney(row.price_cents)}</TableCell>
                <TableCell>{row.location || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.seat_capacity == null ? `${row.seats_taken} taken · unlimited` : `${row.seats_taken} / ${row.seat_capacity} · ${row.seats_remaining} left`}</TableCell>
                <TableCell><Chip size="small" label={row.open ? 'Open' : 'Closed'} color={row.open ? 'success' : 'default'} sx={{ fontWeight: 800 }} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(row)}>Edit</Button>
                  {profile?.role === 'super_admin' && <Button size="small" color="error" onClick={() => void remove(row)}>Delete</Button>}
                </TableCell>
              </TableRow>)}
              {!rows.length && <TableRow><TableCell colSpan={7} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>{loading ? 'Loading…' : 'No class sessions yet.'}</TableCell></TableRow>}
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
          <TextField label="Class name" value={form.name} onChange={event => update('name', event.target.value)} required />
          <TextField label="Description" value={form.description} onChange={event => update('description', event.target.value)} multiline minRows={2} />
          <TextField label="Price (USD)" type="number" value={form.priceDollars} onChange={event => update('priceDollars', event.target.value)} slotProps={{ htmlInput: { min: 1, step: '0.01' } }} required helperText="This exact amount is charged at checkout." />
          <TextField label="Starts at" type="datetime-local" value={form.startsAt} onChange={event => update('startsAt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="Ends at" type="datetime-local" value={form.endsAt} onChange={event => update('endsAt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="Location" value={form.location} onChange={event => update('location', event.target.value)} placeholder="Online, or a campus address" />
          <TextField label="Schedule notes" value={form.scheduleNotes} onChange={event => update('scheduleNotes', event.target.value)} placeholder="Mon–Thu, 6–9 PM ET" />
          <TextField label="Seat capacity (blank = unlimited)" type="number" value={form.seatCapacity} onChange={event => update('seatCapacity', event.target.value)} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
          <FormControlLabel control={<Switch checked={form.open} onChange={event => update('open', event.target.checked)} />} label="Open for registration" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save class session'}</Button>
      </DialogActions>
    </Dialog>
  </>
}

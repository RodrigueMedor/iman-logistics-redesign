import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { RecordsPage } from '../../features/backoffice/RecordsPage'
import { formatDateTime, formatMoney, recordsForEmail, savePayment, type RecordRow } from '../../services/backoffice'
import { applicationsConfig, auditConfig, bookingsConfig, contactsConfig, customersConfig, paymentMethods, paymentsBaseConfig, paymentStatuses } from './backOfficeConfigs'

export function ContactsPage() { return <RecordsPage {...contactsConfig} /> }
export function BookingsPage() { return <RecordsPage {...bookingsConfig} /> }
export function ApplicationsPage() { return <RecordsPage {...applicationsConfig} /> }
export function AuditPage() { return <RecordsPage {...auditConfig} /> }

const customersPageConfig = { ...customersConfig, renderDetail: (row: RecordRow) => <CustomerActivity email={String(row.email)} /> }
export function CustomersPage() { return <RecordsPage {...customersPageConfig} /> }

const paymentsPageConfig = {
  ...paymentsBaseConfig,
  headerAction: (reload: () => void) => <PaymentButton onSaved={reload} />,
  renderDetail: (row: RecordRow, reload: () => void) => <PaymentButton payment={row} onSaved={reload} />,
}
export function PaymentsPage() { return <RecordsPage {...paymentsPageConfig} /> }

function CustomerActivity({ email }: { email: string }) {
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof recordsForEmail>>>()
  const [error, setError] = useState('')
  useEffect(() => { recordsForEmail(email).then(setActivity).catch(() => setError('Activity could not be loaded.')) }, [email])
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
  if (!activity) return <Typography color="text.secondary" mt={2}>Loading activity…</Typography>
  const groups: [string, { reference: string; label: string; status: string; created_at: string }[]][] = [
    ['Messages', activity.contacts.map(item => ({ reference: item.reference, label: item.subject, status: item.status, created_at: item.created_at }))],
    ['Bookings', activity.bookings.map(item => ({ reference: item.reference, label: `${item.service_name} · ${item.booking_date}`, status: `${item.status} · ${item.payment_status}`, created_at: item.created_at }))],
    ['Applications', activity.applications.map(item => ({ reference: item.reference, label: item.position, status: item.status, created_at: item.created_at }))],
    ['Payments', activity.payments.map(item => ({ reference: item.reference, label: `${formatMoney(item.amount_cents, item.currency)} · ${item.description}`, status: item.status, created_at: item.created_at }))],
  ]
  return <Stack spacing={2.5} mt={3}>
    {groups.filter(([, items]) => items.length).map(([title, items]) => <Box key={title}>
      <Typography fontWeight={900} mb={1}>{title}</Typography>
      <Stack spacing={1}>{items.map(item => <Box key={item.reference} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" fontWeight={800}>{item.reference}</Typography><Chip size="small" label={item.status.replaceAll('_', ' ')} /></Stack>
        <Typography variant="body2" mt={.5}>{item.label}</Typography>
        <Typography variant="caption" color="text.secondary">{formatDateTime(item.created_at)}</Typography>
      </Box>)}</Stack>
    </Box>)}
  </Stack>
}

type PaymentForm = { payer_name: string; payer_email: string; description: string; amount: string; currency: string; method: string; status: string; provider_reference: string; booking_reference: string }

function toForm(payment?: RecordRow): PaymentForm {
  return {
    payer_name: String(payment?.payer_name ?? ''),
    payer_email: String(payment?.payer_email ?? ''),
    description: String(payment?.description ?? ''),
    amount: payment ? (Number(payment.amount_cents) / 100).toFixed(2) : '',
    currency: String(payment?.currency ?? 'USD'),
    method: String(payment?.method ?? 'card'),
    status: String(payment?.status ?? 'paid'),
    provider_reference: String(payment?.provider_reference ?? ''),
    booking_reference: String((payment?.booking as { reference?: string } | null)?.reference ?? ''),
  }
}

function PaymentButton({ payment, onSaved }: { payment?: RecordRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PaymentForm>(() => toForm(payment))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (key: keyof PaymentForm, value: string) => setForm(current => ({ ...current, [key]: value }))

  const start = () => {
    setForm(toForm(payment))
    setError('')
    setOpen(true)
  }

  const save = async () => {
    const amount = Number(form.amount)
    if (form.payer_name.trim().length < 2 || !Number.isFinite(amount) || amount < 0) return setError('Enter the payer name and a valid amount.')
    setSaving(true)
    setError('')
    try {
      await savePayment({
        payer_name: form.payer_name.trim(),
        payer_email: form.payer_email.trim().toLowerCase(),
        description: form.description.trim(),
        amount_cents: Math.round(amount * 100),
        currency: form.currency.trim().toUpperCase() || 'USD',
        method: form.method,
        status: form.status,
        provider_reference: form.provider_reference.trim(),
        booking_reference: form.booking_reference.trim() || undefined,
      }, payment?.id)
      setOpen(false)
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The payment could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    {payment?.provider === 'stripe'
      ? <Alert severity="info" sx={{ mt: 2 }}>Paid through Stripe Checkout. Amount and status are updated by Stripe; issue refunds in the Stripe Dashboard.</Alert>
      : payment
        ? <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={start} sx={{ mt: 2 }}>Edit payment details</Button>
        : <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={start}>Record payment</Button>}
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={900}>{payment ? `Edit ${String(payment.reference)}` : 'Record a payment'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label="Payer name" value={form.payer_name} onChange={event => update('payer_name', event.target.value)} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth type="email" label="Payer email" value={form.payer_email} onChange={event => update('payer_email', event.target.value)} /></Grid>
          <Grid size={12}><TextField fullWidth label="Description" placeholder="Dispatch consultation, masterclass enrollment…" value={form.description} onChange={event => update('description', event.target.value)} /></Grid>
          <Grid size={{ xs: 8, sm: 4 }}><TextField fullWidth required type="number" label="Amount" value={form.amount} onChange={event => update('amount', event.target.value)} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} /></Grid>
          <Grid size={{ xs: 4, sm: 2 }}><TextField fullWidth label="Currency" value={form.currency} onChange={event => update('currency', event.target.value)} slotProps={{ htmlInput: { maxLength: 3 } }} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField select fullWidth label="Method" value={form.method} onChange={event => update('method', event.target.value)}>{paymentMethods.map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField select fullWidth label="Status" value={form.status} onChange={event => update('status', event.target.value)}>{paymentStatuses.filter(item => ['pending', 'paid', 'failed', 'refunded'].includes(item.value)).map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Receipt / transaction number" value={form.provider_reference} onChange={event => update('provider_reference', event.target.value)} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Booking reference (optional)" placeholder="BKG-2609-…" value={form.booking_reference} onChange={event => update('booking_reference', event.target.value)} /></Grid>
        </Grid>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</Button>
      </DialogActions>
    </Dialog>
  </>
}

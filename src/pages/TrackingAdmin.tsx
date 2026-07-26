import { FormEvent, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import {
  getManagedShipments,
  saveManagedShipment,
  type ShipmentStatus,
  type ShipmentTracking,
  type TrackingEvent,
} from '../services/tracking'

type FormState = {
  reference: string
  status: ShipmentStatus
  origin: string
  destination: string
  estimatedDelivery: string
  progress: string
  customer: string
  carrier: string
  internalNotes: string
}

const emptyForm: FormState = {
  reference: '',
  status: 'Pending pickup',
  origin: '',
  destination: '',
  estimatedDelivery: '',
  progress: '10',
  customer: '',
  carrier: '',
  internalNotes: '',
}

const statusOptions: ShipmentStatus[] = ['Pending pickup', 'In transit', 'Delivered', 'Exception']

export default function TrackingAdmin() {
  const [shipments, setShipments] = useState(() => getManagedShipments())
  const [form, setForm] = useState<FormState>(emptyForm)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [editingReference, setEditingReference] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | ShipmentStatus>('All')
  const [sortBy, setSortBy] = useState<'updated' | 'reference' | 'progress'>('updated')

  const filteredShipments = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const searched = !normalized ? shipments : shipments.filter(item => [item.reference, item.origin, item.destination, item.status, item.customer ?? '', item.carrier ?? ''].some(value => value.toLowerCase().includes(normalized)))
    const filtered = statusFilter === 'All' ? searched : searched.filter(item => item.status === statusFilter)
    return [...filtered].sort((a, b) => sortBy === 'reference' ? a.reference.localeCompare(b.reference) : sortBy === 'progress' ? b.progress - a.progress : b.lastUpdated.localeCompare(a.lastUpdated))
  }, [query, shipments, sortBy, statusFilter])

  const updateField = (field: keyof FormState, value: string) => setForm(current => ({ ...current, [field]: value }))

  const startNew = () => {
    setForm(emptyForm)
    setEditingReference('')
    setMessage('')
  }

  const startEdit = (shipment: ShipmentTracking) => {
    setEditingReference(shipment.reference)
    setForm({
      reference: shipment.reference,
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      estimatedDelivery: shipment.estimatedDelivery,
      progress: String(shipment.progress),
      customer: shipment.customer ?? '',
      carrier: shipment.carrier ?? '',
      internalNotes: shipment.internalNotes ?? '',
    })
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const reference = form.reference.trim().toUpperCase()
    const progress = Math.min(100, Math.max(0, Number(form.progress)))
    if (!reference || !form.origin.trim() || !form.destination.trim() || !form.estimatedDelivery.trim() || Number.isNaN(progress)) {
      setMessage('Complete every field with a valid progress value.')
      return
    }

    const now = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    const saved: ShipmentTracking = {
      reference,
      status: form.status,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      estimatedDelivery: form.estimatedDelivery.trim(),
      progress,
      lastUpdated: now,
      events: buildEvents(form.status, form.origin.trim(), form.destination.trim(), now),
      customer: form.customer.trim(),
      carrier: form.carrier.trim(),
      internalNotes: form.internalNotes.trim(),
    }
    setShipments(saveManagedShipment(saved))
    setEditingReference(reference)
    setForm(current => ({ ...current, reference }))
    setMessage(`Shipment ${reference} saved. It is now available in the customer tracker.`)
  }

  const counts = statusOptions.map(status => [status, shipments.filter(item => item.status === status).length] as const)

  const exportCsv = () => {
    const rows = [
      ['Reference', 'Status', 'Origin', 'Destination', 'Progress', 'Estimated delivery', 'Customer', 'Carrier', 'Last updated'],
      ...filteredShipments.map(item => [item.reference, item.status, item.origin, item.destination, String(item.progress), item.estimatedDelivery, item.customer ?? '', item.carrier ?? '', item.lastUpdated]),
    ]
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'iman-shipments.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyReference = async (reference: string) => {
    await navigator.clipboard.writeText(reference)
    setMessage(`${reference} copied to the clipboard.`)
  }

  return <>
    <Seo title="Tracking Administration | Iman Logistics" canonical="/tracking/admin/" />
    <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 6, md: 8 } }}>
      <Container>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3}>
          <Box>
            <Chip label="SUPER ADMIN · SECURE ACCESS" color="secondary" sx={{ mb: 2, fontWeight: 900 }} />
            <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 40, md: 58 } }}>Shipment administration</Typography>
            <Typography color="rgba(255,255,255,.76)" fontSize={18} mt={1.5}>Create and update shipment records used by the customer-facing tracker on this device.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Button component={RouterLink} to="/tracking/admin/work-orders/" variant="contained" color="secondary" startIcon={<AssignmentOutlinedIcon />}>Work orders</Button>
            <Button component={RouterLink} to="/tracking/" variant="outlined" endIcon={<OpenInNewRoundedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.6)' }}>Open customer tracker</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 6, md: 8 } }}>
      <Alert severity="warning" sx={{ mb: 4, borderRadius: 3 }}>
        This dashboard stores demonstration records only in this browser. Add authentication and a secure database before using it for real customer shipments.
      </Alert>

      <Grid container spacing={4} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider', position: { lg: 'sticky' }, top: { lg: 130 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
              <Stack direction="row" alignItems="center" spacing={1.25}><DashboardOutlinedIcon color="primary" /><Typography variant="h5" fontWeight={900}>{editingReference ? 'Edit shipment' : 'New shipment'}</Typography></Stack>
              {editingReference && <Button size="small" startIcon={<AddRoundedIcon />} onClick={startNew}>New</Button>}
            </Stack>
            <Stack spacing={2.25}>
              <TextField required label="Tracking reference" placeholder="IMAN-13579" value={form.reference} disabled={Boolean(editingReference)} onChange={event => updateField('reference', event.target.value.toUpperCase())} slotProps={{ htmlInput: { maxLength: 40 } }} />
              <TextField select required label="Shipment status" value={form.status} onChange={event => updateField('status', event.target.value)}>
                {statusOptions.map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
              <TextField required label="Origin" placeholder="Orlando, FL" value={form.origin} onChange={event => updateField('origin', event.target.value)} />
              <TextField required label="Destination" placeholder="Savannah, GA" value={form.destination} onChange={event => updateField('destination', event.target.value)} />
              <TextField required label="Delivery estimate" placeholder="July 30, 2026 · Before 5:00 PM" value={form.estimatedDelivery} onChange={event => updateField('estimatedDelivery', event.target.value)} />
              <TextField required type="number" label="Route progress (%)" value={form.progress} onChange={event => updateField('progress', event.target.value)} slotProps={{ htmlInput: { min: 0, max: 100 } }} />
              <TextField label="Customer or company" placeholder="Customer name" value={form.customer} onChange={event => updateField('customer', event.target.value)} />
              <TextField label="Carrier or driver" placeholder="Assigned carrier" value={form.carrier} onChange={event => updateField('carrier', event.target.value)} />
              <TextField multiline minRows={3} label="Internal notes" placeholder="Visible only in this admin dashboard" value={form.internalNotes} onChange={event => updateField('internalNotes', event.target.value)} />
              <Button type="submit" variant="contained" size="large" startIcon={<SaveOutlinedIcon />}>{editingReference ? 'Save changes' : 'Create shipment'}</Button>
              {message && <Alert severity={message.startsWith('Complete') ? 'error' : 'success'}>{message}</Alert>}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={2} mb={3}>
            {counts.map(([status, count]) => <Grid size={{ xs: 6, sm: 3 }} key={status}><Paper sx={{ p: 2.25, borderRadius: 3, border: 1, borderColor: 'divider' }}><Typography color="text.secondary" fontSize={12} fontWeight={800}>{status}</Typography><Typography variant="h4" fontWeight={900} mt={.5}>{count}</Typography></Paper></Grid>)}
          </Grid>

          <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth size="small" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search shipments" slotProps={{ input: { startAdornment: <SearchOutlinedIcon color="action" sx={{ mr: 1 }} /> } }} /></Grid>
              <Grid size={{ xs: 6, md: 2.5 }}><TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'All' | ShipmentStatus)}><MenuItem value="All">All statuses</MenuItem>{statusOptions.map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, md: 2.5 }}><TextField select fullWidth size="small" label="Sort by" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}><MenuItem value="updated">Last updated</MenuItem><MenuItem value="reference">Reference</MenuItem><MenuItem value="progress">Progress</MenuItem></TextField></Grid>
              <Grid size={{ xs: 12, md: 2 }}><Button fullWidth onClick={exportCsv} startIcon={<DownloadRoundedIcon />}>Export CSV</Button></Grid>
            </Grid>
          </Paper>

          <Stack spacing={2}>
            {filteredShipments.map(shipment => <Paper key={shipment.reference} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, border: 1, borderColor: editingReference === shipment.reference ? 'primary.main' : 'divider' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={2}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 2.5, bgcolor: 'action.selected', color: 'primary.main', flexShrink: 0 }}><LocalShippingOutlinedIcon /></Box>
                  <Box><Typography variant="h6" fontWeight={900}>{shipment.reference}</Typography><Typography color="text.secondary" mt={.25}>{shipment.origin} → {shipment.destination}</Typography>{(shipment.customer || shipment.carrier) && <Typography variant="body2" color="text.secondary" mt={.75}>{shipment.customer && `Customer: ${shipment.customer}`}{shipment.customer && shipment.carrier && ' · '}{shipment.carrier && `Carrier: ${shipment.carrier}`}</Typography>}</Box>
                </Stack>
                <Stack direction="row" spacing={.5} alignItems="center" flexWrap="wrap" useFlexGap><StatusChip status={shipment.status} /><Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copyReference(shipment.reference)}>Copy</Button><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => startEdit(shipment)}>Edit</Button></Stack>
              </Stack>
              <Box mt={2.5}><Stack direction="row" justifyContent="space-between" mb={.75}><Typography variant="body2" color="text.secondary">{shipment.estimatedDelivery}</Typography><Typography variant="body2" fontWeight={900}>{shipment.progress}%</Typography></Stack><LinearProgress variant="determinate" value={shipment.progress} sx={{ height: 7, borderRadius: 5 }} /></Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>Updated {shipment.lastUpdated}</Typography>
              {shipment.internalNotes && <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}><Typography variant="caption" fontWeight={900} color="text.secondary">INTERNAL NOTE</Typography><Typography variant="body2" mt={.25}>{shipment.internalNotes}</Typography></Box>}
            </Paper>)}
            {filteredShipments.length === 0 && <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: 1, borderColor: 'divider' }}><Typography fontWeight={900}>No shipments match your search.</Typography></Paper>}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  </>
}

function StatusChip({ status }: { status: ShipmentStatus }) {
  const color = status === 'Delivered' ? 'success' : status === 'Exception' ? 'warning' : status === 'In transit' ? 'primary' : 'default'
  return <Chip label={status} color={color} size="small" sx={{ fontWeight: 800 }} />
}

function buildEvents(status: ShipmentStatus, origin: string, destination: string, now: string): TrackingEvent[] {
  const pickedUp = status !== 'Pending pickup'
  const moving = status === 'In transit' || status === 'Delivered' || status === 'Exception'
  const delivered = status === 'Delivered'
  return [
    { label: 'Shipment created', location: origin, timestamp: now, completed: true, detail: 'Shipment information was received and confirmed.' },
    { label: 'Picked up', location: origin, timestamp: pickedUp ? now : 'Scheduled', completed: pickedUp, detail: pickedUp ? 'Freight was picked up from the origin facility.' : 'Pickup is being coordinated with the origin facility.' },
    { label: status === 'Exception' ? 'Delivery exception' : 'In transit', location: moving ? origin : '—', timestamp: moving ? now : 'Pending', completed: moving, detail: status === 'Exception' ? 'A delivery exception requires attention from the logistics team.' : moving ? 'The shipment is moving toward its destination.' : 'Transit updates will appear after pickup.' },
    { label: 'Out for delivery', location: destination, timestamp: delivered ? now : 'Pending', completed: delivered, detail: delivered ? 'The shipment was assigned for final delivery.' : 'The shipment will be assigned for final delivery.' },
    { label: 'Delivered', location: destination, timestamp: delivered ? now : 'Pending', completed: delivered, detail: delivered ? 'Delivery was completed and confirmed.' : 'Delivery confirmation will appear here.' },
  ]
}

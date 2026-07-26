import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Box, Button, Chip, Container, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { formatElapsed, generateShipmentReference, listSupabaseWorkOrders, listWorkOrderEmployees, saveAdminWorkOrder, type WorkOrder, type WorkOrderEmployee, type WorkOrderPriority, type WorkOrderStatus } from '../services/workOrders'
import { useAuth } from '../contexts/AuthContext'
import { usCityOptions } from '../data/usCities'

type WorkOrderForm = Omit<WorkOrder, 'createdAt' | 'updatedAt'>

const statusOptions: WorkOrderStatus[] = ['Open', 'In progress', 'Blocked', 'Pending approval', 'Completed']
const priorityOptions: WorkOrderPriority[] = ['Low', 'Normal', 'High', 'Urgent']
const createEmptyForm = (): WorkOrderForm => ({ id: '', title: '', description: '', assignee: '', assigneeId: '', priority: 'Normal', status: 'Open', dueDate: '', shipmentReference: generateShipmentReference(), pickupLocation: '', destination: '', deliveryAppointment: '' })

export default function WorkOrders() {
  const { user, profile, signOut } = useAuth()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [employees, setEmployees] = useState<WorkOrderEmployee[]>([])
  const [form, setForm] = useState<WorkOrderForm>(() => createEmptyForm())
  const [editingId, setEditingId] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | WorkOrderStatus>('All')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [nextOrders, nextEmployees] = await Promise.all([listSupabaseWorkOrders(), listWorkOrderEmployees()])
      setOrders(nextOrders)
      setEmployees(nextEmployees)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to load shared work orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return orders
      .filter(item => statusFilter === 'All' || item.status === statusFilter)
      .filter(item => !normalized || [item.id, item.title, item.assignee, item.shipmentReference, item.priority].some(value => value.toLowerCase().includes(normalized)))
      .sort((a, b) => priorityOptions.indexOf(b.priority) - priorityOptions.indexOf(a.priority))
  }, [orders, query, statusFilter])

  const updateField = (field: keyof WorkOrderForm, value: string) => setForm(current => ({ ...current, [field]: value }))

  const startNew = () => {
    setForm(createEmptyForm())
    setEditingId('')
    setMessage('')
  }

  const startEdit = (order: WorkOrder) => {
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...editable } = order
    setForm(editable)
    setEditingId(order.id)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.assigneeId || !form.dueDate) {
      setMessage('Complete the title, description, assignee, and due date.')
      return
    }
    try {
      const now = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
      const existing = orders.find(item => item.id === editingId)
      const selectedEmployee = employees.find(employee => employee.id === form.assigneeId)
      const saved: WorkOrder = {
        ...form,
        databaseId: existing?.databaseId,
        id: editingId || `WO-${Date.now().toString().slice(-6)}`,
        assignee: selectedEmployee?.fullName || form.assignee,
        title: form.title.trim(),
        description: form.description.trim(),
        shipmentReference: form.shipmentReference.trim().toUpperCase(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        statusHistory: existing?.statusHistory ?? [{ id: `EVENT-${Date.now()}`, status: form.status, actor: profile?.full_name || 'Super Admin', createdAt: new Date().toISOString(), detail: 'Work order created and assigned.' }],
      }
      if (!user?.id) throw new Error('Your administrator session is unavailable. Sign in again.')
      await saveAdminWorkOrder(saved, user.id)
      await loadData()
      setEditingId(saved.id)
      setForm(({ ...saved }))
      setMessage(`${saved.id} saved and assigned to ${saved.assignee}.`)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to save this work order.')
    }
  }

  const quickStatus = async (order: WorkOrder, status: WorkOrderStatus) => {
    const now = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    const isoNow = new Date().toISOString()
    const updated = {
      ...order,
      status,
      updatedAt: now,
      startedAt: status === 'In progress' ? order.startedAt || isoNow : order.startedAt,
      completedAt: status === 'Completed' ? isoNow : order.completedAt,
      actualDeliveryAt: status === 'Completed' ? order.actualDeliveryAt || isoNow : order.actualDeliveryAt,
      statusHistory: [...(order.statusHistory || []), {
        id: `EVENT-${Date.now()}`,
        status,
        actor: profile?.full_name || 'Super Admin',
        createdAt: isoNow,
        detail: status === 'Completed' ? 'Completion reviewed and approved by super admin.' : status === 'In progress' && order.status === 'Pending approval' ? 'Returned to employee for additional work.' : 'Status changed by super admin.',
      }],
    }
    try {
      if (!user?.id) throw new Error('Your administrator session is unavailable. Sign in again.')
      await saveAdminWorkOrder(updated, user.id)
      await loadData()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to update work-order status.')
    }
  }

  const counts = statusOptions.map(status => [status, orders.filter(item => item.status === status).length] as const)

  return <>
    <Seo title="Work Orders | Iman Logistics" canonical="/tracking/admin/work-orders/" />
    <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 6, md: 8 } }}>
      <Container>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3}>
          <Box><Chip label="SUPER ADMIN · SECURE ACCESS" color="secondary" sx={{ mb: 2, fontWeight: 900 }} /><Typography component="h1" variant="h2" sx={{ fontSize: { xs: 40, md: 58 } }}>Work order dashboard</Typography><Typography color="rgba(255,255,255,.76)" fontSize={18} mt={1.5}>{profile?.full_name ? `Signed in as ${profile.full_name}. ` : ''}Create assignments, connect them to shipments, and keep the team’s operational work moving.</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Button component={RouterLink} to="/tracking/team/work-orders/" variant="contained" color="secondary" startIcon={<PersonOutlineRoundedIcon />}>Employee view</Button>
            <Button component={RouterLink} to="/tracking/admin/users/" variant="outlined" startIcon={<GroupOutlinedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.6)' }}>Manage users</Button>
            <Button component={RouterLink} to="/tracking/admin/" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.6)' }}>Shipment dashboard</Button>
            <Button onClick={() => void signOut()} variant="text" startIcon={<LogoutRoundedIcon />} sx={{ color: 'white' }}>Sign out</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 6, md: 8 } }}>
      <Alert severity="success" sx={{ mb: 4, borderRadius: 3 }}>This page is restricted to the super admin. Employee accounts cannot open the assignment controls.</Alert>
      {loading && <Alert severity="info" sx={{ mb: 4 }}>Loading shared work orders…</Alert>}
      <Grid container spacing={4} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider', position: { lg: 'sticky' }, top: { lg: 130 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}><Stack direction="row" spacing={1.25} alignItems="center"><AddTaskRoundedIcon color="primary" /><Typography variant="h5" fontWeight={900}>{editingId ? 'Edit work order' : 'New work order'}</Typography></Stack>{editingId && <Button size="small" onClick={startNew}>New</Button>}</Stack>
            <Stack spacing={2.25}>
              <TextField required label="Task title" value={form.title} onChange={event => updateField('title', event.target.value)} />
              <TextField required multiline minRows={3} label="Task description" value={form.description} onChange={event => updateField('description', event.target.value)} />
              <TextField select required label="Assign to employee" value={form.assigneeId || ''} onChange={event => {
                const assigneeId = event.target.value
                const employee = employees.find(item => item.id === assigneeId)
                setForm(current => ({ ...current, assigneeId, assignee: employee?.fullName || '' }))
              }}>{employees.map(employee => <MenuItem key={employee.id} value={employee.id}>{employee.fullName} · {employee.email}</MenuItem>)}</TextField>
              {!employees.length && !loading && <Alert severity="warning">Create an active employee account before assigning a work order.</Alert>}
              <Grid container spacing={1.5}><Grid size={{ xs: 6 }}><TextField select fullWidth label="Priority" value={form.priority} onChange={event => updateField('priority', event.target.value)}>{priorityOptions.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 6 }}><TextField select fullWidth label="Status" value={form.status} onChange={event => updateField('status', event.target.value)}>{statusOptions.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid></Grid>
              <TextField required type="date" label="Due date" value={form.dueDate} onChange={event => updateField('dueDate', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Shipment reference" value={form.shipmentReference} helperText="Generated automatically for each new work order." slotProps={{ input: { readOnly: true } }} />
              <Autocomplete freeSolo options={usCityOptions} value={form.pickupLocation || ''} onInputChange={(_event, value) => updateField('pickupLocation', value)} renderInput={params => <TextField {...params} required label="Pickup city and state" placeholder="Search U.S. cities" />} />
              <Autocomplete freeSolo options={usCityOptions} value={form.destination || ''} onInputChange={(_event, value) => updateField('destination', value)} renderInput={params => <TextField {...params} required label="Destination city and state" placeholder="Search U.S. cities" />} />
              <TextField type="datetime-local" label="Delivery appointment" value={form.deliveryAppointment || ''} onChange={event => updateField('deliveryAppointment', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Button type="submit" variant="contained" size="large" startIcon={<SaveOutlinedIcon />}>{editingId ? 'Save changes' : 'Create work order'}</Button>
              {message && <Alert severity={message.startsWith('Complete') ? 'error' : 'success'}>{message}</Alert>}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={2} mb={3}>{counts.map(([status, count]) => <Grid size={{ xs: 6, sm: 3 }} key={status}><Paper sx={{ p: 2.25, borderRadius: 3, border: 1, borderColor: 'divider' }}><Typography color="text.secondary" fontSize={12} fontWeight={800}>{status}</Typography><Typography variant="h4" fontWeight={900} mt={.5}>{count}</Typography></Paper></Grid>)}</Grid>
          <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth size="small" placeholder="Search tasks, teams, or shipments" value={query} onChange={event => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <SearchOutlinedIcon color="action" sx={{ mr: 1 }} /> } }} /></Grid><Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'All' | WorkOrderStatus)}><MenuItem value="All">All work orders</MenuItem>{statusOptions.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid></Grid></Paper>

          <Stack spacing={2}>
            {filteredOrders.map(order => <Paper key={order.id} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, border: 1, borderColor: editingId === order.id ? 'primary.main' : 'divider' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack direction="row" spacing={2}><Box sx={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 2.5, bgcolor: 'action.selected', color: 'primary.main', flexShrink: 0 }}><AssignmentOutlinedIcon /></Box><Box><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h6" fontWeight={900}>{order.title}</Typography><PriorityChip priority={order.priority} /></Stack><Typography variant="body2" color="text.secondary" mt={.5}>{order.id} · Assigned to {order.assignee}</Typography></Box></Stack>
                <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={order.status} /><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => startEdit(order)}>Edit</Button></Stack>
              </Stack>
              <Typography color="text.secondary" mt={2}>{order.description}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} mt={2}><Typography variant="body2"><strong>Due:</strong> {order.dueDate}</Typography>{order.shipmentReference && <Typography variant="body2"><strong>Shipment:</strong> {order.shipmentReference}</Typography>}</Stack>
              {(order.pickupLocation || order.destination) && <Paper variant="outlined" sx={{ mt: 2.5, p: 2, borderRadius: 2.5, bgcolor: 'action.hover' }}><Grid container spacing={2}><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary" fontWeight={800}>PICKUP</Typography><Typography fontWeight={800}>{order.pickupLocation || 'Not provided'}</Typography></Grid><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary" fontWeight={800}>DESTINATION</Typography><Typography fontWeight={800}>{order.destination || 'Not provided'}</Typography></Grid><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary" fontWeight={800}>DELIVERY APPOINTMENT</Typography><Typography fontWeight={800}>{order.deliveryAppointment ? new Date(order.deliveryAppointment).toLocaleString() : 'Not provided'}</Typography></Grid></Grid></Paper>}
              {(order.startedAt || order.completedAt || order.actualDeliveryAt) && <Grid container spacing={1.5} mt={2}><Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">TIME TO RESOLVE</Typography><Typography fontWeight={900}>{formatElapsed(order.startedAt || order.createdAt, order.completedAt)}</Typography></Grid><Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">ACTUAL DELIVERY</Typography><Typography fontWeight={900}>{order.actualDeliveryAt ? new Date(order.actualDeliveryAt).toLocaleString() : 'Pending'}</Typography></Grid><Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">DELIVERY RESULT</Typography><Typography fontWeight={900} color={order.actualDeliveryAt && order.deliveryAppointment && new Date(order.actualDeliveryAt) > new Date(order.deliveryAppointment) ? 'error.main' : 'success.main'}>{!order.actualDeliveryAt ? 'Pending delivery' : !order.deliveryAppointment ? 'Delivered · appointment not set' : new Date(order.actualDeliveryAt) <= new Date(order.deliveryAppointment) ? 'Delivered on time' : 'Delivered late'}</Typography></Grid></Grid>}
              {order.resolutionSummary && <Alert severity="success" sx={{ mt: 2 }}><strong>Resolution:</strong> {order.resolutionSummary}</Alert>}
              {!!order.statusHistory?.length && <Box mt={2.5}><Typography fontWeight={900} mb={1}>Activity timeline</Typography><Stack spacing={.75}>{order.statusHistory.slice().reverse().map(event => <Stack key={event.id} direction="row" justifyContent="space-between" spacing={2}><Typography variant="body2"><strong>{event.status}</strong> · {event.actor}{event.detail ? ` — ${event.detail}` : ''}</Typography><Typography variant="caption" color="text.secondary" flexShrink={0}>{new Date(event.createdAt).toLocaleString()}</Typography></Stack>)}</Stack></Box>}
              {!!order.notes?.length && <Box mt={2.5}><Typography fontWeight={900} mb={1}>Employee notes</Typography><Stack spacing={1}>{order.notes.map(note => <Paper key={note.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}><Typography variant="caption" fontWeight={900}>{note.kind} · {note.author}</Typography><Typography>{note.message}</Typography></Paper>)}</Stack></Box>}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={2.5}><Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', alignSelf: 'center' }}>Updated {order.updatedAt}</Typography>{order.status === 'Pending approval' && <><Button size="small" color="warning" variant="outlined" onClick={() => quickStatus(order, 'In progress')}>Return for correction</Button><Button size="small" color="success" variant="contained" onClick={() => quickStatus(order, 'Completed')}>Approve completion</Button></>}{order.status !== 'In progress' && order.status !== 'Pending approval' && order.status !== 'Completed' && <Button size="small" onClick={() => quickStatus(order, 'In progress')}>Start task</Button>}</Stack>
            </Paper>)}
            {!filteredOrders.length && <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: 1, borderColor: 'divider' }}><Typography fontWeight={900}>No work orders match this view.</Typography></Paper>}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  </>
}

function StatusChip({ status }: { status: WorkOrderStatus }) {
  const color = status === 'Completed' ? 'success' : status === 'Blocked' || status === 'Pending approval' ? 'warning' : status === 'In progress' ? 'primary' : 'default'
  return <Chip label={status} size="small" color={color} sx={{ fontWeight: 800 }} />
}

function PriorityChip({ priority }: { priority: WorkOrderPriority }) {
  const color = priority === 'Urgent' ? 'error' : priority === 'High' ? 'warning' : 'default'
  return <Chip label={priority} size="small" color={color} variant={priority === 'Normal' || priority === 'Low' ? 'outlined' : 'filled'} sx={{ fontWeight: 800 }} />
}

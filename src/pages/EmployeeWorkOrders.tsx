import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Container, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { formatElapsed, listSupabaseWorkOrders, saveEmployeeWorkOrder, type WorkOrder, type WorkOrderPriority, type WorkOrderStatus } from '../services/workOrders'
import { useAuth } from '../contexts/AuthContext'

export default function EmployeeWorkOrders() {
  const { profile, signOut } = useAuth()
  const employee = profile?.full_name || ''
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<'Active' | 'History' | 'All' | WorkOrderStatus>('Active')
  const [message, setMessage] = useState('')
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const loadOrders = async () => {
    setLoading(true)
    try {
      setOrders(await listSupabaseWorkOrders())
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to load assigned work orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadOrders() }, [])

  const assignedOrders = useMemo(() => orders
    .filter(order => order.assignee === employee || order.assignee.startsWith(`${employee} ·`))
    .filter(order => {
      if (statusFilter === 'All') return true
      if (statusFilter === 'Active') return order.status !== 'Completed'
      if (statusFilter === 'History') return order.status === 'Completed'
      return order.status === statusFilter
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [employee, orders, statusFilter])

  const updateStatus = async (order: WorkOrder, status: WorkOrderStatus) => {
    const noteText = (noteInputs[order.id] || '').trim()
    const mostRecentSavedNote = order.notes?.[order.notes.length - 1]?.message.trim() || ''
    const requiredComment = noteText || mostRecentSavedNote
    if ((status === 'Blocked' || status === 'Pending approval') && !requiredComment) {
      setMessage(status === 'Blocked' ? 'Enter the reason this work is blocked before reporting it.' : 'Enter a completion comment explaining how the work order was resolved.')
      return
    }
    const now = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    const isoNow = new Date().toISOString()
    const notes = noteText
      ? [...(order.notes || []), { id: `NOTE-${Date.now()}`, author: employee, message: noteText, createdAt: now, kind: status === 'Completed' ? 'Completion comment' as const : 'Progress note' as const }]
      : order.notes
    const updated = {
      ...order,
      status,
      notes,
      updatedAt: now,
      startedAt: status === 'In progress' ? order.startedAt || isoNow : order.startedAt,
      blockedAt: status === 'Blocked' ? isoNow : order.blockedAt,
      completionSubmittedAt: status === 'Pending approval' ? isoNow : order.completionSubmittedAt,
      resolutionSummary: status === 'Pending approval' ? requiredComment : order.resolutionSummary,
      statusHistory: [...(order.statusHistory || []), {
        id: `EVENT-${Date.now()}`,
        status,
        actor: employee,
        createdAt: isoNow,
        detail: status === 'Blocked'
          ? `Blocked: ${requiredComment}`
          : status === 'Pending approval'
            ? `Submitted for super-admin approval: ${requiredComment}`
            : status === 'In progress' && order.status === 'Blocked'
              ? 'Work resumed after the blocker was cleared.'
              : noteText || `Work order changed to ${status}.`,
      }],
    }
    try {
      await saveEmployeeWorkOrder(updated)
      await loadOrders()
      setNoteInputs(current => ({ ...current, [order.id]: '' }))
      setMessage(status === 'Pending approval' ? `${order.id} submitted to the super admin for approval.` : `${order.id} updated to ${status}.`)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to update this work order.')
    }
  }

  const addNote = async (order: WorkOrder) => {
    const noteText = (noteInputs[order.id] || '').trim()
    if (!noteText) {
      setMessage('Enter a progress note before saving.')
      return
    }
    const now = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    const notes = [...(order.notes || []), { id: `NOTE-${Date.now()}`, author: employee, message: noteText, createdAt: now, kind: 'Progress note' as const }]
    try {
      await saveEmployeeWorkOrder({ ...order, notes, updatedAt: now })
      await loadOrders()
      setNoteInputs(current => ({ ...current, [order.id]: '' }))
      setMessage(`${order.id} progress note saved.`)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to save this progress note.')
    }
  }

  const isAssigned = (order: WorkOrder) => order.assignee === employee || order.assignee.startsWith(`${employee} ·`)
  const activeCount = orders.filter(order => isAssigned(order) && order.status !== 'Completed').length
  const completedCount = orders.filter(order => isAssigned(order) && order.status === 'Completed').length

  return <>
    <Seo title="My Work Orders | Iman Logistics" canonical="/tracking/team/work-orders/" />
    <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 6, md: 8 } }}>
      <Container>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3}>
          <Box><Chip label="EMPLOYEE · SECURE ACCESS" color="secondary" sx={{ mb: 2, fontWeight: 900 }} /><Typography component="h1" variant="h2" sx={{ fontSize: { xs: 40, md: 58 } }}>My work orders</Typography><Typography color="rgba(255,255,255,.76)" fontSize={18} mt={1.5}>See your assigned tasks, review deadlines, and keep the admin informed as work progresses.</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button component={RouterLink} to="/" variant="outlined" startIcon={<LanguageRoundedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.6)' }}>Public website</Button><Button component={RouterLink} to="/tracking/admin/work-orders/" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.6)', display: profile?.role === 'super_admin' ? 'inline-flex' : 'none' }}>Admin view</Button><Button onClick={() => void signOut()} variant="contained" color="secondary">Sign out</Button></Stack>
        </Stack>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 6, md: 8 } }}>
      <Alert severity="info" sx={{ mb: 4, borderRadius: 3 }}>You are signed in as {employee}. Only work assigned to your account is available in this view.</Alert>
      {loading && <Alert severity="info" sx={{ mb: 4 }}>Loading assigned work orders…</Alert>}

      <Grid container spacing={3} mb={4} alignItems="stretch">
        <Grid size={{ xs: 12, md: 6 }}><Paper sx={{ p: 3, height: '100%', borderRadius: 4, border: 1, borderColor: 'divider' }}><Stack direction="row" spacing={2} alignItems="center"><Box sx={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}><PersonOutlineRoundedIcon /></Box><Box><Typography color="text.secondary" fontSize={12} fontWeight={800}>SIGNED-IN EMPLOYEE</Typography><Typography variant="h6" fontWeight={900}>{employee}</Typography></Box></Stack></Paper></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Paper sx={{ p: 3, height: '100%', borderRadius: 4, border: 1, borderColor: 'divider' }}><Typography color="text.secondary" fontWeight={800} fontSize={12}>ACTIVE TASKS</Typography><Typography variant="h3" fontWeight={900} mt={.5}>{activeCount}</Typography></Paper></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Paper sx={{ p: 3, height: '100%', borderRadius: 4, border: 1, borderColor: 'divider' }}><Typography color="text.secondary" fontWeight={800} fontSize={12}>COMPLETED</Typography><Typography variant="h3" fontWeight={900} mt={.5}>{completedCount}</Typography></Paper></Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box><Typography variant="h4" fontWeight={900}>{statusFilter === 'History' ? 'My work history' : `Assigned to ${employee.split(' · ')[0]}`}</Typography><Typography color="text.secondary" mt={.5}>{statusFilter === 'History' ? `${completedCount} completed work order${completedCount === 1 ? '' : 's'} with resolution and delivery records.` : 'Only this employee’s work orders are shown.'}</Typography></Box>
        <TextField select size="small" label="Show" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} sx={{ minWidth: 220 }}><MenuItem value="Active">Active work</MenuItem><MenuItem value="History">Work history</MenuItem><MenuItem value="All">All assigned work</MenuItem>{(['Open', 'In progress', 'Blocked'] as WorkOrderStatus[]).map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>
      </Stack>

      {message && <Alert severity={message.startsWith('Enter') ? 'warning' : 'success'} sx={{ mb: 3 }}>{message}</Alert>}

      <Stack spacing={2.5}>
        {assignedOrders.map(order => <Paper key={order.id} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h5" fontWeight={900}>{order.title}</Typography><PriorityChip priority={order.priority} /></Stack><Typography variant="body2" color="text.secondary" mt={.75}>{order.id}</Typography></Box>
            <StatusChip status={order.status} />
          </Stack>
          <Typography color="text.secondary" fontSize={17} mt={2}>{order.description}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mt={2.5}><Stack direction="row" spacing={1} alignItems="center"><CalendarTodayOutlinedIcon color="action" fontSize="small" /><Typography variant="body2"><strong>Due:</strong> {order.dueDate}</Typography></Stack>{order.shipmentReference && <Stack direction="row" spacing={1} alignItems="center"><LocalShippingOutlinedIcon color="action" fontSize="small" /><Typography variant="body2"><strong>Shipment:</strong> {order.shipmentReference}</Typography></Stack>}</Stack>
          {(order.pickupLocation || order.destination || order.deliveryAppointment) && <Paper variant="outlined" sx={{ p: 2.5, mt: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}><Grid container spacing={2}><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary" fontWeight={900}>PICKUP</Typography><Typography fontWeight={900}>{order.pickupLocation || 'Not provided'}</Typography></Grid><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary" fontWeight={900}>DESTINATION</Typography><Typography fontWeight={900}>{order.destination || 'Not provided'}</Typography></Grid><Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary" fontWeight={900}>DELIVER BY</Typography><Typography fontWeight={900}>{order.deliveryAppointment ? new Date(order.deliveryAppointment).toLocaleString() : 'Not provided'}</Typography></Grid></Grid></Paper>}
          {order.completedAt && <Alert severity="success" sx={{ mt: 2.5 }}><strong>Resolved in {formatElapsed(order.startedAt || order.createdAt, order.completedAt)}.</strong> {order.resolutionSummary}</Alert>}
          {!!order.notes?.length && <Stack spacing={1.25} mt={3}>{order.notes.map(note => <Paper key={note.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'action.hover' }}><Stack direction="row" justifyContent="space-between" spacing={2}><Typography fontWeight={900} fontSize={13}>{note.kind}</Typography><Typography variant="caption" color="text.secondary">{note.createdAt}</Typography></Stack><Typography mt={.75}>{note.message}</Typography><Typography variant="caption" color="text.secondary">By {note.author}</Typography></Paper>)}</Stack>}
          {!!order.statusHistory?.length && <Box mt={3}><Typography fontWeight={900} mb={1.25}>Work-order activity</Typography><Stack spacing={1}>{order.statusHistory.map((event, index) => <Stack key={event.id} direction="row" spacing={1.5} alignItems="flex-start"><Box sx={{ width: 10, height: 10, mt: .65, borderRadius: '50%', bgcolor: event.status === 'Blocked' ? 'warning.main' : event.status === 'Completed' ? 'success.main' : 'primary.main', boxShadow: index < order.statusHistory!.length - 1 ? '0 18px 0 -4px currentColor' : 'none', flexShrink: 0 }} /><Box flex={1}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={.5}><Typography variant="body2" fontWeight={900}>{event.status}</Typography><Typography variant="caption" color="text.secondary">{new Date(event.createdAt).toLocaleString()}</Typography></Stack><Typography variant="body2" color="text.secondary">{event.detail || 'Status updated.'} · {event.actor}</Typography></Box></Stack>)}</Stack></Box>}
          {order.status !== 'Completed' && order.status !== 'Pending approval' && <Stack spacing={1.25} mt={3}><TextField multiline minRows={2} fullWidth label="Progress note, blocker reason, or completion comment" placeholder="Explain progress, a blocker, or exactly how the work was resolved…" value={noteInputs[order.id] || ''} onChange={event => setNoteInputs(current => ({ ...current, [order.id]: event.target.value }))} /><Stack direction="row" justifyContent="flex-end"><Button size="small" onClick={() => addNote(order)}>Save progress note</Button></Stack></Stack>}
          {order.status === 'Pending approval' && <Alert severity="warning" sx={{ mt: 3 }}>Completion submitted. This work order will move to Work History after the super admin approves it.</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mt={3} pt={2.5} borderTop={1} borderColor="divider"><Typography variant="caption" color="text.secondary">Updated {order.updatedAt}</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{order.status === 'Open' && <Button variant="outlined" onClick={() => updateStatus(order, 'In progress')}>Start task</Button>}{order.status !== 'Blocked' && order.status !== 'Pending approval' && order.status !== 'Completed' && <Button color="warning" variant="outlined" onClick={() => updateStatus(order, 'Blocked')}>Report blocked</Button>}{order.status === 'Blocked' && <Button variant="outlined" onClick={() => updateStatus(order, 'In progress')}>Resume task</Button>}{order.status !== 'Completed' && order.status !== 'Pending approval' && <Button variant="contained" startIcon={<AssignmentTurnedInOutlinedIcon />} onClick={() => updateStatus(order, 'Pending approval')}>Submit completion</Button>}</Stack></Stack>
        </Paper>)}
        {!assignedOrders.length && <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, border: 1, borderColor: 'divider' }}><AssignmentTurnedInOutlinedIcon color="primary" sx={{ fontSize: 48 }} /><Typography variant="h5" fontWeight={900} mt={2}>No work orders in this view</Typography><Typography color="text.secondary" mt={1}>Choose another filter or ask the admin to assign a task.</Typography></Paper>}
      </Stack>
    </Container>
  </>
}

function StatusChip({ status }: { status: WorkOrderStatus }) {
  const color = status === 'Completed' ? 'success' : status === 'Blocked' || status === 'Pending approval' ? 'warning' : status === 'In progress' ? 'primary' : 'default'
  return <Chip label={status} color={color} sx={{ fontWeight: 900, alignSelf: 'flex-start' }} />
}

function PriorityChip({ priority }: { priority: WorkOrderPriority }) {
  const color = priority === 'Urgent' ? 'error' : priority === 'High' ? 'warning' : 'default'
  return <Chip label={priority} size="small" color={color} variant={priority === 'Normal' || priority === 'Low' ? 'outlined' : 'filled'} sx={{ fontWeight: 800 }} />
}

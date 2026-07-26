export type WorkOrderStatus = 'Open' | 'In progress' | 'Blocked' | 'Pending approval' | 'Completed'
export type WorkOrderPriority = 'Low' | 'Normal' | 'High' | 'Urgent'
export type WorkOrderNote = {
  id: string
  author: string
  message: string
  createdAt: string
  kind: 'Progress note' | 'Completion comment'
}
export type WorkOrderStatusEvent = {
  id: string
  status: WorkOrderStatus
  actor: string
  createdAt: string
  detail?: string
}

export type WorkOrder = {
  databaseId?: string
  id: string
  title: string
  description: string
  assignee: string
  assigneeId?: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  dueDate: string
  shipmentReference: string
  createdAt: string
  updatedAt: string
  notes?: WorkOrderNote[]
  pickupLocation?: string
  destination?: string
  deliveryAppointment?: string
  actualDeliveryAt?: string
  startedAt?: string
  blockedAt?: string
  completedAt?: string
  completionSubmittedAt?: string
  resolutionSummary?: string
  statusHistory?: WorkOrderStatusEvent[]
}

export type WorkOrderEmployee = {
  id: string
  fullName: string
  email: string
}

export function formatElapsed(start?: string, end?: string) {
  if (!start || !end) return 'Not available'
  const milliseconds = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'Not available'
  const minutes = Math.round(milliseconds / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const remainingMinutes = minutes % 60
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${remainingMinutes}m`].filter(Boolean).join(' ')
}

const storageKey = 'iman-demo-work-orders'

export function generateShipmentReference() {
  const date = new Date()
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(100000 + Math.random() * 900000)
  return `IMAN-${year}${month}-${random}`
}

export const demoEmployees = [
  'Maya Johnson · Operations',
  'Daniel Brooks · Dispatch',
  'Sofia Martinez · Customer Support',
  'Ethan Williams · Billing',
  'Ava Thompson · Safety',
] as const

const demoWorkOrders: WorkOrder[] = [
  {
    id: 'WO-1001',
    title: 'Confirm delivery appointment',
    description: 'Call the Atlanta receiver and confirm the delivery window for tomorrow.',
    assignee: 'Maya Johnson · Operations',
    priority: 'High',
    status: 'In progress',
    dueDate: '2026-07-25',
    shipmentReference: 'IMAN-12345',
    createdAt: 'Jul 24, 2026, 9:15 AM',
    updatedAt: 'Jul 24, 2026, 1:30 PM',
  },
  {
    id: 'WO-1002',
    title: 'Review weather exception',
    description: 'Contact the carrier and update the revised delivery estimate.',
    assignee: 'Daniel Brooks · Dispatch',
    priority: 'Urgent',
    status: 'Blocked',
    dueDate: '2026-07-24',
    shipmentReference: 'IMAN-54321',
    createdAt: 'Jul 24, 2026, 12:45 PM',
    updatedAt: 'Jul 24, 2026, 12:45 PM',
  },
]

export function getWorkOrders(): WorkOrder[] {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) return JSON.parse(stored) as WorkOrder[]
  } catch {
    // Fall back to demo records when browser storage is unavailable.
  }
  return demoWorkOrders
}

export function saveWorkOrder(workOrder: WorkOrder): WorkOrder[] {
  const current = getWorkOrders()
  const exists = current.some(item => item.id === workOrder.id)
  const next = exists ? current.map(item => item.id === workOrder.id ? workOrder : item) : [workOrder, ...current]
  window.localStorage.setItem(storageKey, JSON.stringify(next))
  return next
}

type WorkOrderRow = {
  id: string
  work_order_number: string
  title: string
  description: string
  assignee_id: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  due_date: string
  shipment_reference: string
  pickup_location: string
  destination: string
  delivery_appointment: string | null
  actual_delivery_at: string | null
  started_at: string | null
  blocked_at: string | null
  completed_at: string | null
  completion_submitted_at: string | null
  resolution_summary: string
  notes: WorkOrderNote[]
  status_history: WorkOrderStatusEvent[]
  created_at: string
  updated_at: string
}

const formatDateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : ''

const mapRow = (row: WorkOrderRow, employeeNames: Map<string, string>): WorkOrder => ({
  databaseId: row.id,
  id: row.work_order_number,
  title: row.title,
  description: row.description,
  assigneeId: row.assignee_id,
  assignee: employeeNames.get(row.assignee_id) || 'Unknown employee',
  priority: row.priority,
  status: row.status,
  dueDate: row.due_date,
  shipmentReference: row.shipment_reference,
  pickupLocation: row.pickup_location,
  destination: row.destination,
  deliveryAppointment: row.delivery_appointment || '',
  actualDeliveryAt: row.actual_delivery_at || undefined,
  startedAt: row.started_at || undefined,
  blockedAt: row.blocked_at || undefined,
  completedAt: row.completed_at || undefined,
  completionSubmittedAt: row.completion_submitted_at || undefined,
  resolutionSummary: row.resolution_summary,
  notes: row.notes || [],
  statusHistory: row.status_history || [],
  createdAt: formatDateTime(row.created_at),
  updatedAt: formatDateTime(row.updated_at),
})

export async function listWorkOrderEmployees(): Promise<WorkOrderEmployee[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'employee')
    .eq('active', true)
    .order('full_name')
  if (error) throw error
  return (data || []).map(item => ({ id: item.id, fullName: item.full_name, email: item.email }))
}

export async function listSupabaseWorkOrders(): Promise<WorkOrder[]> {
  if (!supabase) return getWorkOrders()
  const [{ data: rows, error }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from('work_orders').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
  ])
  if (error) throw error
  if (profileError) throw profileError
  const names = new Map((profiles || []).map(item => [item.id, item.full_name]))
  return ((rows || []) as WorkOrderRow[]).map(row => mapRow(row, names))
}

export async function saveAdminWorkOrder(workOrder: WorkOrder, adminId: string): Promise<void> {
  if (!supabase || !workOrder.assigneeId) throw new Error('Select an active employee.')
  const payload = {
    work_order_number: workOrder.id,
    title: workOrder.title,
    description: workOrder.description,
    assignee_id: workOrder.assigneeId,
    created_by: adminId,
    priority: workOrder.priority,
    status: workOrder.status,
    due_date: workOrder.dueDate,
    shipment_reference: workOrder.shipmentReference,
    pickup_location: workOrder.pickupLocation || '',
    destination: workOrder.destination || '',
    delivery_appointment: workOrder.deliveryAppointment || null,
    actual_delivery_at: workOrder.actualDeliveryAt || null,
    started_at: workOrder.startedAt || null,
    blocked_at: workOrder.blockedAt || null,
    completed_at: workOrder.completedAt || null,
    completion_submitted_at: workOrder.completionSubmittedAt || null,
    resolution_summary: workOrder.resolutionSummary || '',
    notes: workOrder.notes || [],
    status_history: workOrder.statusHistory || [],
    updated_at: new Date().toISOString(),
  }
  const query = workOrder.databaseId
    ? supabase.from('work_orders').update(payload).eq('id', workOrder.databaseId)
    : supabase.from('work_orders').insert(payload)
  const { error } = await query
  if (error) throw error
}

export async function saveEmployeeWorkOrder(workOrder: WorkOrder): Promise<void> {
  if (!supabase || !workOrder.databaseId) throw new Error('This work order is not connected to the shared database.')
  const { error } = await supabase.rpc('employee_update_work_order', {
    order_id: workOrder.databaseId,
    next_status: workOrder.status,
    next_notes: workOrder.notes || [],
    next_history: workOrder.statusHistory || [],
    next_resolution_summary: workOrder.resolutionSummary || '',
  })
  if (error) throw error
}
import { supabase } from '../lib/supabase'

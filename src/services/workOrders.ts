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
  id: string
  title: string
  description: string
  assignee: string
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

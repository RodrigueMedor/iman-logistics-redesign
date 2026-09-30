import { api } from './api'

export type BackOfficeTable = 'contact_submissions' | 'consultation_bookings' | 'job_applications' | 'freight_dispatch_masterclass_registrations' | 'payments' | 'customers' | 'notification_log' | 'audit_logs'
export type RecordRow = Record<string, unknown> & { id?: string | number }

// API resource for each back-office table.
const resource: Record<BackOfficeTable, string> = {
  contact_submissions: 'contact-submissions',
  consultation_bookings: 'bookings',
  job_applications: 'job-applications',
  freight_dispatch_masterclass_registrations: 'freight-broker-registrations',
  notification_log: 'notification-log',
  payments: 'payments',
  customers: 'customers',
  audit_logs: 'audit-logs',
}

export type ListQuery = {
  table: BackOfficeTable
  search?: string
  filters?: Record<string, string>
  page: number
  pageSize: number
}

export async function listRecords({ table, search, filters = {}, page, pageSize }: ListQuery) {
  const params = new URLSearchParams({ page: String(page + 1), pageSize: String(pageSize) })
  if (search?.trim()) params.set('search', search.trim())
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const result = await api<{ data: RecordRow[]; total: number }>(`/admin/${resource[table]}?${params}`, { auth: true })
  return { rows: result.data, count: result.total }
}

export async function updateRecord(table: BackOfficeTable, id: string | number, changes: Record<string, unknown>) {
  await api(`/admin/${resource[table]}/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: changes, auth: true })
}

export async function deleteRecord(table: BackOfficeTable, id: string | number) {
  await api(`/admin/${resource[table]}/${encodeURIComponent(String(id))}`, { method: 'DELETE', auth: true })
}

export type PaymentInput = {
  payer_name: string
  payer_email: string
  description: string
  amount_cents: number
  currency: string
  method: string
  status: string
  provider_reference: string
  booking_reference?: string
}

export async function savePayment(values: PaymentInput, id?: string | number) {
  if (id) await api(`/admin/payments/${encodeURIComponent(String(id))}`, { method: 'PUT', body: values, auth: true })
  else await api('/admin/payments', { body: values, auth: true })
}

export async function fileUrl(path: string) {
  return (await api<{ url: string }>(`/admin/files/signed-url?path=${encodeURIComponent(path)}`, { auth: true })).url
}

type Activity<T> = (T & { reference: string; status: string; created_at: string })[]
export async function recordsForEmail(email: string) {
  return api<{
    contacts: Activity<{ subject: string }>
    bookings: Activity<{ service_name: string; booking_date: string; payment_status: string }>
    applications: Activity<{ position: string }>
    payments: Activity<{ description: string; amount_cents: number; currency: string }>
    registrations?: Activity<{ payment_status: string; class: { name: string } | null }>
  }>(`/admin/customers/${encodeURIComponent(email)}/activity`, { auth: true })
}

export type BrokerClassRow = {
  id: string
  name: string
  description: string | null
  price_cents: number
  starts_at: string
  ends_at: string
  registration_deadline: string | null
  days_of_week: string | null
  class_time: string | null
  delivery_mode: 'online' | 'in_person' | null
  location: string | null
  instructor_name: string | null
  seat_capacity: number | null
  status: 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED'
  timezone: string
  allows_online: boolean
  allows_in_person: boolean
  zoom_join_url: string | null
  online_instructions: string
  physical_location: string | null
  in_person_instructions: string
  seats_taken: number
  seats_remaining: number | null
}
export type BrokerClassInput = Omit<BrokerClassRow, 'id' | 'seats_taken' | 'seats_remaining'>
export const brokerClassStatuses = ['OPEN', 'FULL', 'CLOSED', 'COMPLETED'] as const

export const listBrokerClassesAdmin = () => api<BrokerClassRow[]>('/admin/freight-broker/classes', { auth: true })
export async function saveBrokerClass(values: BrokerClassInput, id?: string) {
  if (id) await api(`/admin/freight-broker/classes/${id}`, { method: 'PUT', body: values, auth: true })
  else await api('/admin/freight-broker/classes', { body: values, auth: true })
}
export const deleteBrokerClass = (id: string) => api(`/admin/freight-broker/classes/${id}`, { method: 'DELETE', auth: true })

export type NotificationRow = { id: number; created_at: string; channel: string; template: string; recipient: string; subject: string; status: string; provider: string; error: string }
export const registrationNotifications = (id: string) => api<NotificationRow[]>(`/admin/freight-broker/registrations/${id}/notifications`, { auth: true })

export type DashboardStats = {
  contacts: { total: number; new: number; last7Days: number }
  bookings: { total: number; pending: number; upcoming: number; unpaid: number }
  applications: { total: number; new: number; inProgress: number }
  brokerRegistrations: { total: number; confirmed: number; awaitingPayment: number }
  payments: { paidCents: number; paidLast30DaysCents: number; pending: number }
  shipments: { total: number; inTransit: number; exceptions: number }
  customers: number
  daily: { day: string; count: number }[]
}

export async function dashboardStats() {
  return api<DashboardStats>('/admin/stats', { auth: true })
}

const activityPaths: Record<string, string> = { Message: '/admin/contacts/', Booking: '/admin/bookings/', Application: '/admin/applications/' }
export async function recentActivity(limit = 8) {
  const rows = await api<{ id: string; kind: string; reference: string; full_name: string; title: string; status: string; created_at: string }[]>(`/admin/recent-activity?limit=${limit}`, { auth: true })
  return rows.map(row => ({ ...row, path: activityPaths[row.kind] }))
}

export const formatMoney = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100)
export const formatDateTime = (value?: unknown) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(value))) : '—'
export const formatDate = (value?: unknown) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`)) : '—'

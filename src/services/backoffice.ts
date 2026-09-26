import { api } from './api'

export type BackOfficeTable = 'contact_submissions' | 'consultation_bookings' | 'job_applications' | 'payments' | 'customers' | 'audit_logs'
export type RecordRow = Record<string, unknown> & { id?: string | number }

// API resource for each back-office table.
const resource: Record<BackOfficeTable, string> = {
  contact_submissions: 'contact-submissions',
  consultation_bookings: 'bookings',
  job_applications: 'job-applications',
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
  }>(`/admin/customers/${encodeURIComponent(email)}/activity`, { auth: true })
}

export type DashboardStats = {
  contacts: { total: number; new: number; last7Days: number }
  bookings: { total: number; pending: number; upcoming: number; unpaid: number }
  applications: { total: number; new: number; inProgress: number }
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

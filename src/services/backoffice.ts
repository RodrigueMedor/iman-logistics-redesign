import { supabase } from '../lib/supabase'

export type BackOfficeTable = 'contact_submissions' | 'consultation_bookings' | 'job_applications' | 'payments' | 'customers' | 'audit_logs'
export type RecordRow = Record<string, unknown> & { id?: string | number }

export type ListQuery = {
  table: BackOfficeTable
  search?: string
  searchColumns: string[]
  filters?: Record<string, string>
  orderBy: { column: string; ascending?: boolean }
  page: number
  pageSize: number
}

function client() {
  if (!supabase) throw new Error('The back office requires Supabase. Add the values from .env.example.')
  return supabase
}

// PostgREST filter syntax treats these characters specially inside or().
const cleanSearch = (value: string) => value.replace(/[,()*%\\:"]/g, ' ').trim()

export async function listRecords({ table, search, searchColumns, filters = {}, orderBy, page, pageSize }: ListQuery) {
  let query = client().from(table).select('*', { count: 'exact' })
  for (const [column, value] of Object.entries(filters)) if (value) query = query.eq(column, value)
  const term = cleanSearch(search ?? '')
  if (term && searchColumns.length) query = query.or(searchColumns.map(column => `${column}.ilike.*${term}*`).join(','))
  const from = page * pageSize
  const { data, error, count } = await query.order(orderBy.column, { ascending: orderBy.ascending ?? false }).range(from, from + pageSize - 1)
  if (error) throw error
  return { rows: (data ?? []) as RecordRow[], count: count ?? 0 }
}

export async function updateRecord(table: BackOfficeTable, id: string | number, changes: Record<string, unknown>) {
  const { error } = await client().from(table).update(changes).eq('id', id)
  if (error) throw error
}

export async function insertRecord(table: BackOfficeTable, values: Record<string, unknown>) {
  const { error } = await client().from(table).insert(values)
  if (error) throw error
}

export async function deleteRecord(table: BackOfficeTable, id: string | number) {
  const { error, count } = await client().from(table).delete({ count: 'exact' }).eq('id', id)
  if (error) throw error
  if (!count) throw new Error('You do not have permission to delete this record.')
}

export async function fileUrl(path: string) {
  const { data, error } = await client().storage.from('submission-files').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

export async function recordsForEmail(email: string) {
  const db = client()
  const [contacts, bookings, applications, payments] = await Promise.all([
    db.from('contact_submissions').select('reference, subject, status, created_at').eq('email', email).order('created_at', { ascending: false }),
    db.from('consultation_bookings').select('reference, service_name, booking_date, status, payment_status, created_at').eq('email', email).order('created_at', { ascending: false }),
    db.from('job_applications').select('reference, position, status, created_at').eq('email', email).order('created_at', { ascending: false }),
    db.from('payments').select('reference, description, amount_cents, currency, status, created_at').eq('payer_email', email).order('created_at', { ascending: false }),
  ])
  for (const result of [contacts, bookings, applications, payments]) if (result.error) throw result.error
  return { contacts: contacts.data ?? [], bookings: bookings.data ?? [], applications: applications.data ?? [], payments: payments.data ?? [] }
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
  const { data, error } = await client().rpc('admin_dashboard_stats')
  if (error) throw error
  return data as DashboardStats
}

export async function recentActivity(limit = 8) {
  const db = client()
  const [contacts, bookings, applications] = await Promise.all([
    db.from('contact_submissions').select('id, reference, full_name, subject, status, created_at').order('created_at', { ascending: false }).limit(limit),
    db.from('consultation_bookings').select('id, reference, full_name, service_name, status, created_at').order('created_at', { ascending: false }).limit(limit),
    db.from('job_applications').select('id, reference, full_name, position, status, created_at').order('created_at', { ascending: false }).limit(limit),
  ])
  return [
    ...(contacts.data ?? []).map(row => ({ kind: 'Message', path: '/admin/contacts/', title: row.subject, ...row })),
    ...(bookings.data ?? []).map(row => ({ kind: 'Booking', path: '/admin/bookings/', title: row.service_name, ...row })),
    ...(applications.data ?? []).map(row => ({ kind: 'Application', path: '/admin/applications/', title: row.position, ...row })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)
}

export const formatMoney = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100)
export const formatDateTime = (value?: unknown) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(value))) : '—'
export const formatDate = (value?: unknown) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`)) : '—'

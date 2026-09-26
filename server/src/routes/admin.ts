import { Router, type Request } from 'express'
import { z } from 'zod'
import { backOffice, requireRole, staff, superAdminOnly, type Role } from '../lib/auth'
import { HttpError, parse } from '../lib/http'
import { audit, serviceClient } from '../lib/supabase'
import { listQuery, paymentInput, recordUpdate, shipmentInput, userCreate, userUpdate } from '../schemas'

export const adminRoutes = Router()

type Resource = {
  table: string
  id: string
  select?: string
  orderBy: { column: string; ascending?: boolean }
  search: string[]
  filters: string[]
  updatable: string[]
  deletable?: boolean
  roles: Role[]
}

// Every back-office list shares one shape. Search and filter columns are fixed
// here, and the database's row-level security and column grants still apply
// because each query runs as the signed-in staff member.
export const resources: Record<string, Resource> = {
  'contact-submissions': { table: 'contact_submissions', id: 'id', orderBy: { column: 'created_at' }, search: ['reference', 'full_name', 'email', 'subject', 'company', 'phone'], filters: ['status'], updatable: ['status', 'admin_notes'], deletable: true, roles: backOffice },
  bookings: { table: 'consultation_bookings', id: 'id', orderBy: { column: 'booking_date' }, search: ['reference', 'full_name', 'email', 'service_name', 'company', 'phone'], filters: ['status', 'payment_status'], updatable: ['status', 'payment_status', 'admin_notes'], deletable: true, roles: backOffice },
  'job-applications': { table: 'job_applications', id: 'id', orderBy: { column: 'created_at' }, search: ['reference', 'full_name', 'email', 'position', 'location', 'phone'], filters: ['status'], updatable: ['status', 'admin_notes'], deletable: true, roles: backOffice },
  payments: { table: 'payments', id: 'id', select: '*, booking:consultation_bookings(reference)', orderBy: { column: 'created_at' }, search: ['reference', 'payer_name', 'payer_email', 'description', 'provider_reference'], filters: ['status', 'method'], updatable: ['status', 'admin_notes'], deletable: true, roles: backOffice },
  customers: { table: 'customers', id: 'email', orderBy: { column: 'last_seen_at' }, search: ['email', 'full_name', 'phone'], filters: [], updatable: [], roles: backOffice },
  'audit-logs': { table: 'audit_logs', id: 'id', orderBy: { column: 'occurred_at' }, search: ['action', 'entity_id', 'actor_email', 'actor_role'], filters: ['entity_type'], updatable: [], roles: superAdminOnly },
}

// PostgREST treats these characters specially inside or() filters.
const cleanSearch = (value: string) => value.replace(/[,()*%\\:"]/g, ' ').trim()

adminRoutes.get('/me', requireRole(['super_admin', 'admin', 'employee']), (req, res) => {
  res.json(staff(req).staff)
})

adminRoutes.get('/stats', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.rpc('admin_dashboard_stats')
  if (error) throw error
  res.json(data)
})

adminRoutes.get('/recent-activity', requireRole(backOffice), async (req, res) => {
  const { db } = staff(req)
  const limit = parse(z.object({ limit: z.coerce.number().int().min(1).max(50).default(8) }), req.query).limit
  const [contacts, bookings, applications] = await Promise.all([
    db.from('contact_submissions').select('id, reference, full_name, subject, status, created_at').order('created_at', { ascending: false }).limit(limit),
    db.from('consultation_bookings').select('id, reference, full_name, service_name, status, created_at').order('created_at', { ascending: false }).limit(limit),
    db.from('job_applications').select('id, reference, full_name, position, status, created_at').order('created_at', { ascending: false }).limit(limit),
  ])
  for (const result of [contacts, bookings, applications]) if (result.error) throw result.error
  res.json([
    ...(contacts.data ?? []).map(row => ({ kind: 'Message', title: row.subject, ...row })),
    ...(bookings.data ?? []).map(row => ({ kind: 'Booking', title: row.service_name, ...row })),
    ...(applications.data ?? []).map(row => ({ kind: 'Application', title: row.position, ...row })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit))
})

adminRoutes.get('/files/signed-url', requireRole(backOffice), async (req, res) => {
  const { path } = parse(z.object({ path: z.string().regex(/^(contact|resumes)\/[0-9a-f-]{36}\.(pdf|docx?|png|jpg)$/) }), req.query, 'Invalid file path.')
  const { data, error } = await staff(req).db.storage.from('submission-files').createSignedUrl(path, 300)
  if (error) throw new HttpError(404, 'The file could not be found. It may not have finished uploading.')
  res.json({ url: data.signedUrl, expiresIn: 300 })
})

adminRoutes.get('/customers/:email/activity', requireRole(backOffice), async (req, res) => {
  const { db } = staff(req)
  const email = String(req.params.email).toLowerCase()
  const [contacts, bookings, applications, payments] = await Promise.all([
    db.from('contact_submissions').select('reference, subject, status, created_at').eq('email', email).order('created_at', { ascending: false }),
    db.from('consultation_bookings').select('reference, service_name, booking_date, status, payment_status, created_at').eq('email', email).order('created_at', { ascending: false }),
    db.from('job_applications').select('reference, position, status, created_at').eq('email', email).order('created_at', { ascending: false }),
    db.from('payments').select('reference, description, amount_cents, currency, status, created_at').eq('payer_email', email).order('created_at', { ascending: false }),
  ])
  for (const result of [contacts, bookings, applications, payments]) if (result.error) throw result.error
  res.json({ contacts: contacts.data, bookings: bookings.data, applications: applications.data, payments: payments.data })
})

// ---------------------------------------------------------------------------
// Payments recorded by staff
// ---------------------------------------------------------------------------

async function bookingIdFor(req: Request, reference?: string) {
  if (!reference) return null
  const { data } = await staff(req).db.from('consultation_bookings').select('id').eq('reference', reference.toUpperCase()).maybeSingle()
  if (!data) throw new HttpError(400, 'No booking has that reference.')
  return data.id as string
}

function paymentValues(input: z.infer<typeof paymentInput>) {
  const { booking_reference: _reference, ...values } = input
  return { ...values, payer_email: values.payer_email.toLowerCase(), currency: values.currency.toUpperCase() }
}

adminRoutes.post('/payments', requireRole(backOffice), async (req, res) => {
  const input = parse(paymentInput, req.body)
  const { data, error } = await staff(req).db.from('payments').insert({ ...paymentValues(input), booking_id: await bookingIdFor(req, input.booking_reference), provider: 'manual' }).select('*').single()
  if (error) throw error
  res.status(201).json(data)
})

adminRoutes.put('/payments/:id', requireRole(backOffice), async (req, res) => {
  const input = parse(paymentInput, req.body)
  const { db } = staff(req)
  const { data: current } = await db.from('payments').select('provider').eq('id', req.params.id).maybeSingle()
  if (!current) throw new HttpError(404, 'Payment not found.')
  if (current.provider === 'stripe') throw new HttpError(403, 'Stripe payments are updated by Stripe. Issue refunds in the Stripe Dashboard.')
  const { data, error } = await db.from('payments').update({ ...paymentValues(input), booking_id: await bookingIdFor(req, input.booking_reference) }).eq('id', req.params.id).select('*').single()
  if (error) throw error
  res.json(data)
})

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

const shipmentRow = (input: z.infer<typeof shipmentInput>) => ({
  reference: input.reference, status: input.status, origin: input.origin, destination: input.destination, estimated_delivery: input.estimatedDelivery,
  progress: input.progress, events: input.events, customer: input.customer, carrier: input.carrier, internal_notes: input.internalNotes,
})

adminRoutes.get('/shipments', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.from('shipments').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  res.json(data)
})

adminRoutes.post('/shipments', requireRole(backOffice), async (req, res) => {
  const { data, error } = await staff(req).db.from('shipments').insert(shipmentRow(parse(shipmentInput, req.body))).select('*').single()
  if (error?.code === '23505') throw new HttpError(409, 'A shipment with that reference already exists.')
  if (error) throw error
  res.status(201).json(data)
})

adminRoutes.put('/shipments/:reference', requireRole(backOffice), async (req, res) => {
  const input = parse(shipmentInput, { ...req.body, reference: req.params.reference })
  const { data, error } = await staff(req).db.from('shipments').update(shipmentRow(input)).eq('reference', input.reference).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Shipment not found.')
  res.json(data)
})

adminRoutes.delete('/shipments/:reference', requireRole(superAdminOnly), async (req, res) => {
  const { count, error } = await staff(req).db.from('shipments').delete({ count: 'exact' }).eq('reference', String(req.params.reference).toUpperCase())
  if (error) throw error
  if (!count) throw new HttpError(404, 'Shipment not found.')
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Users and roles (super admin only; uses the secret key for Supabase Auth)
// ---------------------------------------------------------------------------

adminRoutes.get('/users', requireRole(superAdminOnly), async (req, res) => {
  const { data, error } = await staff(req).db.from('profiles').select('id, full_name, email, role, active, created_at').order('created_at')
  if (error) throw error
  res.json(data)
})

adminRoutes.post('/users', requireRole(superAdminOnly), async (req, res) => {
  const { staff: actor } = staff(req)
  const input = parse(userCreate, req.body, 'Full name, a valid email, and a password of at least 10 characters are required.')
  const email = input.email.toLowerCase()
  const admin = serviceClient()
  const { data, error } = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName } })
  if (error) throw new HttpError(400, error.message)
  const { error: profileError } = await admin.from('profiles').update({ full_name: input.fullName, email, role: input.role, active: true }).eq('id', data.user.id)
  if (profileError) throw profileError
  await audit({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action: 'user.create', entityType: 'profiles', entityId: data.user.id, metadata: { email, role: input.role } })
  res.status(201).json({ id: data.user.id, message: `${input.fullName}'s ${input.role} account was created.` })
})

async function targetUser(req: Request) {
  const { staff: actor } = staff(req)
  const id = parse(z.uuid(), req.params.id, 'Invalid user id.')
  if (id === actor.id) throw new HttpError(400, 'Your own super-admin account cannot be changed here.')
  const { data: target } = await serviceClient().from('profiles').select('id, email, role').eq('id', id).maybeSingle()
  if (!target) throw new HttpError(404, 'User not found.')
  if (target.role === 'super_admin') throw new HttpError(403, 'Super-admin accounts cannot be changed here.')
  return { actor, target }
}

adminRoutes.patch('/users/:id', requireRole(superAdminOnly), async (req, res) => {
  const { actor, target } = await targetUser(req)
  const body = parse(userUpdate, req.body, 'Invalid user update.')
  const email = body.email?.toLowerCase()
  const admin = serviceClient()
  const authUpdates: { email?: string; password?: string; user_metadata?: { full_name: string }; ban_duration?: string } = {}
  if (email) authUpdates.email = email
  if (body.password) authUpdates.password = body.password
  if (body.fullName) authUpdates.user_metadata = { full_name: body.fullName }
  if (typeof body.active === 'boolean') authUpdates.ban_duration = body.active ? 'none' : '876000h'
  const { error } = await admin.auth.admin.updateUserById(target.id, authUpdates)
  if (error) throw new HttpError(400, error.message)
  const profileUpdates = Object.fromEntries(Object.entries({ full_name: body.fullName, email, active: body.active, role: body.role }).filter(([, value]) => value !== undefined))
  if (Object.keys(profileUpdates).length) {
    const { error: profileError } = await admin.from('profiles').update(profileUpdates).eq('id', target.id)
    if (profileError) throw profileError
  }
  await audit({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action: 'user.update', entityType: 'profiles', entityId: target.id, metadata: { fields: Object.keys(profileUpdates), passwordChanged: Boolean(body.password) } })
  res.json({ message: 'User updated.' })
})

adminRoutes.delete('/users/:id', requireRole(superAdminOnly), async (req, res) => {
  const { actor, target } = await targetUser(req)
  const { error } = await serviceClient().auth.admin.deleteUser(target.id)
  if (error?.message.includes('foreign key') || error?.message.includes('Database error')) throw new HttpError(409, 'This user still has work orders. Reassign them or suspend the account instead.')
  if (error) throw new HttpError(400, error.message)
  await audit({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action: 'user.delete', entityType: 'profiles', entityId: target.id, metadata: { email: target.email } })
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Generic list / read / update / delete for back-office records
// (registered last so the specific routes above win)
// ---------------------------------------------------------------------------

function resourceFor(req: Request) {
  const resource = resources[String(req.params.resource)]
  if (!resource) throw new HttpError(404, 'Not found.')
  if (!resource.roles.includes(staff(req).staff.role)) throw new HttpError(403, 'You do not have permission to do this.')
  return resource
}

adminRoutes.get('/:resource', requireRole(backOffice), async (req, res) => {
  const resource = resourceFor(req)
  const query = parse(listQuery, req.query)
  let request = staff(req).db.from(resource.table).select(resource.select ?? '*', { count: 'exact' })
  for (const filter of resource.filters) {
    const value = query[filter as keyof typeof query]
    if (typeof value === 'string' && value) request = request.eq(filter, value)
  }
  const term = cleanSearch(query.search ?? '')
  if (term) request = request.or(resource.search.map(column => `${column}.ilike.*${term}*`).join(','))
  const from = (query.page - 1) * query.pageSize
  const { data, error, count } = await request.order(resource.orderBy.column, { ascending: resource.orderBy.ascending ?? false }).range(from, from + query.pageSize - 1)
  if (error) throw error
  res.json({ data, page: query.page, pageSize: query.pageSize, total: count ?? 0 })
})

adminRoutes.get('/:resource/:id', requireRole(backOffice), async (req, res) => {
  const resource = resourceFor(req)
  const { data, error } = await staff(req).db.from(resource.table).select(resource.select ?? '*').eq(resource.id, req.params.id).maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Record not found.')
  res.json(data)
})

adminRoutes.patch('/:resource/:id', requireRole(backOffice), async (req, res) => {
  const resource = resourceFor(req)
  const changes = parse(recordUpdate, req.body)
  const blocked = Object.keys(changes).filter(key => !resource.updatable.includes(key))
  if (blocked.length) throw new HttpError(400, `These fields cannot be changed: ${blocked.join(', ')}.`)
  const { data, error } = await staff(req).db.from(resource.table).update(changes).eq(resource.id, req.params.id).select('*').maybeSingle()
  if (error?.code === '23505') throw new HttpError(409, 'Another active booking already holds that time slot.')
  if (error) throw error
  if (!data) throw new HttpError(404, 'Record not found.')
  res.json(data)
})

adminRoutes.delete('/:resource/:id', requireRole(superAdminOnly), async (req, res) => {
  const resource = resourceFor(req)
  if (!resource.deletable) throw new HttpError(405, 'These records cannot be deleted.')
  const { count, error } = await staff(req).db.from(resource.table).delete({ count: 'exact' }).eq(resource.id, req.params.id)
  if (error) throw error
  if (!count) throw new HttpError(404, 'Record not found.')
  res.status(204).end()
})

import { Router } from 'express'
import { requireRole, staff, superAdminOnly } from '../lib/auth'
import { HttpError, parse } from '../lib/http'
import { workOrderInput, workOrderProgress } from '../schemas'

// Work orders: super admins create and manage them; employees see and update
// only the ones assigned to them (enforced by row-level security).
export const workOrderRoutes = Router()

workOrderRoutes.get('/', requireRole(['super_admin', 'employee']), async (req, res) => {
  const { db } = staff(req)
  const [orders, profiles] = await Promise.all([
    db.from('work_orders').select('*').order('created_at', { ascending: false }),
    db.from('profiles').select('id, full_name'),
  ])
  if (orders.error) throw orders.error
  if (profiles.error) throw profiles.error
  const names = new Map((profiles.data ?? []).map(profile => [profile.id, profile.full_name]))
  res.json((orders.data ?? []).map(order => ({ ...order, assignee_name: names.get(order.assignee_id) ?? 'Unknown employee' })))
})

workOrderRoutes.get('/employees', requireRole(superAdminOnly), async (req, res) => {
  const { data, error } = await staff(req).db.from('profiles').select('id, full_name, email').eq('role', 'employee').eq('active', true).order('full_name')
  if (error) throw error
  res.json(data)
})

workOrderRoutes.post('/', requireRole(superAdminOnly), async (req, res) => {
  const { db, staff: actor } = staff(req)
  const { data, error } = await db.from('work_orders').insert({ ...parse(workOrderInput, req.body), created_by: actor.id }).select('*').single()
  if (error?.code === '23505') throw new HttpError(409, 'A work order with that number already exists.')
  if (error) throw error
  res.status(201).json(data)
})

workOrderRoutes.put('/:id', requireRole(superAdminOnly), async (req, res) => {
  const { data, error } = await staff(req).db.from('work_orders').update({ ...parse(workOrderInput, req.body), updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Work order not found.')
  res.json(data)
})

workOrderRoutes.post('/:id/progress', requireRole(['super_admin', 'employee']), async (req, res) => {
  const input = parse(workOrderProgress, req.body)
  const { data, error } = await staff(req).db.rpc('employee_update_work_order', {
    order_id: req.params.id, next_status: input.status, next_notes: input.notes, next_history: input.statusHistory, next_resolution_summary: input.resolutionSummary,
  })
  if (error) throw new HttpError(error.message.includes('not found') ? 404 : 400, error.message)
  res.json(data)
})

import { z } from 'zod'
import { adminClient, audit, handleError, HttpError, json, readJson, requireRole } from '../lib/server'

const schema = z.object({
  id: z.uuid(),
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.email().max(254).optional(),
  password: z.string().min(10, 'Passwords must be at least 10 characters.').max(128).optional(),
  active: z.boolean().optional(),
  role: z.enum(['employee', 'admin']).optional(),
})

export default async (request: Request) => {
  if (!['PATCH', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405)
  try {
    const { profile: requester } = await requireRole(request, ['super_admin'])
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Invalid request.')
    const body = parsed.data
    if (body.id === requester.id) throw new HttpError(400, 'Your own super-admin account cannot be changed here.')

    const admin = adminClient()
    const { data: target } = await admin.from('profiles').select('id, email, role').eq('id', body.id).maybeSingle()
    if (!target) throw new HttpError(404, 'User not found.')
    if (target.role === 'super_admin') throw new HttpError(403, 'Super-admin accounts cannot be changed here.')
    const actor = { actorId: requester.id, actorEmail: requester.email, actorRole: requester.role, entityType: 'profiles', entityId: body.id }

    if (request.method === 'DELETE') {
      const { error } = await admin.auth.admin.deleteUser(body.id)
      if (error?.message.includes('foreign key') || error?.message.includes('Database error')) throw new HttpError(409, 'This user still has work orders. Reassign them or suspend the account instead.')
      if (error) throw new HttpError(400, error.message)
      await audit(admin, { ...actor, action: 'user.delete', metadata: { email: target.email } })
      return json({ message: 'User deleted.' })
    }

    const email = body.email?.toLowerCase()
    const authUpdates: { email?: string; password?: string; user_metadata?: { full_name: string }; ban_duration?: string } = {}
    if (email) authUpdates.email = email
    if (body.password) authUpdates.password = body.password
    if (body.fullName) authUpdates.user_metadata = { full_name: body.fullName }
    if (typeof body.active === 'boolean') authUpdates.ban_duration = body.active ? 'none' : '876000h'
    const { error } = await admin.auth.admin.updateUserById(body.id, authUpdates)
    if (error) throw new HttpError(400, error.message)

    const profileUpdates = Object.fromEntries(Object.entries({ full_name: body.fullName, email, active: body.active, role: body.role }).filter(([, value]) => value !== undefined))
    if (Object.keys(profileUpdates).length) {
      const { error: profileError } = await admin.from('profiles').update(profileUpdates).eq('id', body.id)
      if (profileError) throw profileError
    }

    await audit(admin, { ...actor, action: 'user.update', metadata: { fields: Object.keys(profileUpdates), passwordChanged: Boolean(body.password) } })
    return json({ message: 'User updated.' })
  } catch (error) {
    return handleError(error)
  }
}

import { z } from 'zod'
import { adminClient, audit, handleError, HttpError, json, readJson, requireRole } from '../lib/server'

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(['employee', 'admin']).default('employee'),
})

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  try {
    const { profile: requester } = await requireRole(request, ['super_admin'])
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'Full name, a valid email, and a password of at least 10 characters are required.')
    const { fullName, password, role } = parsed.data
    const email = parsed.data.email.toLowerCase()

    const admin = adminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) throw new HttpError(400, error.message)
    const { error: profileError } = await admin.from('profiles').update({ full_name: fullName, email, role, active: true }).eq('id', data.user.id)
    if (profileError) throw profileError

    await audit(admin, { actorId: requester.id, actorEmail: requester.email, actorRole: requester.role, action: 'user.create', entityType: 'profiles', entityId: data.user.id, metadata: { email, role } })
    return json({ message: `${fullName}'s ${role === 'admin' ? 'admin' : 'employee'} account was created.` }, 201)
  } catch (error) {
    return handleError(error)
  }
}

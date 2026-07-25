import { createClient } from '@supabase/supabase-js'

export default async (request: Request) => {
  if (!['PATCH', 'DELETE'].includes(request.method)) return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!url || !publishableKey || !secretKey) return Response.json({ error: 'Server authentication is not configured.' }, { status: 500 })
  if (!token) return Response.json({ error: 'Sign in is required.' }, { status: 401 })

  const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: authData } = await userClient.auth.getUser(token)
  const { data: requester } = authData.user
    ? await userClient.from('profiles').select('role, active').eq('id', authData.user.id).single()
    : { data: null }
  if (!authData.user || requester?.role !== 'super_admin' || !requester.active) return Response.json({ error: 'Only a super admin can manage employees.' }, { status: 403 })

  const body = await request.json() as { id?: string; fullName?: string; email?: string; password?: string; active?: boolean }
  if (!body.id || body.id === authData.user.id) return Response.json({ error: 'The super-admin account cannot be changed here.' }, { status: 400 })
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

  if (request.method === 'DELETE') {
    const { error } = await admin.auth.admin.deleteUser(body.id)
    return error ? Response.json({ error: error.message }, { status: 400 }) : Response.json({ message: 'Employee deleted.' })
  }

  const authUpdates: { email?: string; password?: string; user_metadata?: { full_name: string }; ban_duration?: string } = {}
  if (body.email) authUpdates.email = body.email
  if (body.password) authUpdates.password = body.password
  if (body.fullName) authUpdates.user_metadata = { full_name: body.fullName }
  if (typeof body.active === 'boolean') authUpdates.ban_duration = body.active ? 'none' : '876000h'
  const { error } = await admin.auth.admin.updateUserById(body.id, authUpdates)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  await admin.from('profiles').update({ full_name: body.fullName, email: body.email, active: body.active }).eq('id', body.id)
  return Response.json({ message: 'Employee updated.' })
}

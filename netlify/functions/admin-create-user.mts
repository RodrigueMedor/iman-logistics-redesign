import { createClient } from '@supabase/supabase-js'

export default async (request: Request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })

  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!url || !publishableKey || !secretKey) return Response.json({ error: 'Server authentication is not configured.' }, { status: 500 })
  if (!token) return Response.json({ error: 'Sign in is required.' }, { status: 401 })

  const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: authData } = await userClient.auth.getUser(token)
  if (!authData.user) return Response.json({ error: 'Invalid or expired session.' }, { status: 401 })
  const { data: requester } = await userClient.from('profiles').select('role, active').eq('id', authData.user.id).single()
  if (requester?.role !== 'super_admin' || !requester.active) return Response.json({ error: 'Only a super admin can create users.' }, { status: 403 })

  const { email, password, fullName } = await request.json() as { email?: string; password?: string; fullName?: string }
  if (!email || !password || password.length < 10 || !fullName) return Response.json({ error: 'Full name, email, and a password of at least 10 characters are required.' }, { status: 400 })

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  await admin.from('profiles').update({ full_name: fullName, email, role: 'employee', active: true }).eq('id', data.user.id)
  return Response.json({ message: `${fullName}'s employee account was created.` }, { status: 201 })
}

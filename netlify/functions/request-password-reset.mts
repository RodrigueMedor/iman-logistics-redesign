import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { adminClient, env, handleError, HttpError, json, readJson } from '../lib/server'

const schema = z.object({ email: z.email().max(254) })
const genericReply = { message: 'If that address belongs to a super-admin account, a reset link has been sent.' }

// Password recovery from the sign-in page is limited to super admins; other
// staff ask a super admin to reset their password. The reply never reveals
// whether an account exists.
export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  try {
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'Enter a valid email address.')
    const email = parsed.data.email.toLowerCase()

    const { data: profile } = await adminClient().from('profiles').select('id').eq('email', email).eq('role', 'super_admin').eq('active', true).maybeSingle()
    if (profile) {
      const { url, publishableKey } = env()
      const publicClient = createClient(url, publishableKey, { auth: { persistSession: false } })
      const origin = process.env.URL || new URL(request.url).origin
      const { error } = await publicClient.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/admin/reset-password/` })
      if (error) console.error('Password reset email failed', error)
    }
    return json(genericReply)
  } catch (error) {
    return handleError(error)
  }
}

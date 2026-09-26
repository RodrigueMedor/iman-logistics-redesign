import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type StaffRole = 'super_admin' | 'admin' | 'employee'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status })

export function handleError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status)
  console.error(error)
  return json({ error: 'Something went wrong. Please try again.' }, 500)
}

// Accepts the same variable names as the other Iman sites (VITE_* plus
// SUPABASE_SERVICE_ROLE_KEY), so one Netlify env setup works for both.
export function env() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !publishableKey || !secretKey) throw new HttpError(500, 'Server is not configured.')
  return { url, publishableKey, secretKey }
}

// Uses the secret key: bypasses row-level security. Server-side only.
export function adminClient(): SupabaseClient {
  const { url, secretKey } = env()
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Verifies the caller's Supabase session and that their profile has one of the roles.
export async function requireRole(request: Request, roles: StaffRole[]) {
  const { url, publishableKey } = env()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Sign in is required.')
  const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: authData } = await userClient.auth.getUser(token)
  if (!authData.user) throw new HttpError(401, 'Invalid or expired session.')
  const { data: profile } = await userClient.from('profiles').select('id, email, role, active').eq('id', authData.user.id).single()
  if (!profile?.active || !roles.includes(profile.role)) throw new HttpError(403, 'You do not have permission to do this.')
  return { user: authData.user, profile: profile as { id: string; email: string; role: StaffRole; active: boolean } }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T
  } catch {
    throw new HttpError(400, 'Invalid request body.')
  }
}

export async function audit(client: SupabaseClient, entry: { actorId?: string; actorEmail?: string; actorRole?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }) {
  const { error } = await client.from('audit_logs').insert({
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? '',
    actor_role: entry.actorRole ?? 'system',
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? '',
    metadata: entry.metadata ?? {},
  })
  if (error) console.error('Audit log write failed', error)
}

// Basic abuse protection for public forms: limits submissions per email per hour.
export async function enforceRateLimit(client: SupabaseClient, table: string, email: string, limit = 5) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await client.from(table).select('id', { count: 'exact', head: true }).eq('email', email.toLowerCase()).gte('created_at', since)
  if (error) throw error
  if ((count ?? 0) >= limit) throw new HttpError(429, 'Too many submissions. Please try again later.')
}

export const allowedUploadTypes: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}
export const maxUploadBytes = 5 * 1024 * 1024

// Reserves a path in the private bucket and returns a one-time upload token
// the browser uses to send the file straight to storage.
export async function createUploadSlot(client: SupabaseClient, folder: string, file: { name: string; type: string; size: number }) {
  const extension = allowedUploadTypes[file.type]
  if (!extension) throw new HttpError(400, 'File must be a PDF, DOC, DOCX, PNG, or JPG.')
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxUploadBytes) throw new HttpError(400, 'File must be 5 MB or smaller.')
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { data, error } = await client.storage.from('submission-files').createSignedUploadUrl(path)
  if (error) throw error
  return { path, token: data.token, name: file.name.slice(0, 200) }
}

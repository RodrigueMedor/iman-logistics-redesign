import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config, databaseConfigured } from '../config'
import { HttpError } from './http'

let service: SupabaseClient | null = null

// Secret-key client: bypasses row-level security. Used only for public form
// inserts, Stripe webhooks, and super-admin user management.
export function serviceClient(): SupabaseClient {
  if (!databaseConfigured()) throw new HttpError(503, 'The database is not configured on the server.')
  service ??= createClient(config.supabaseUrl, config.supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return service
}

// Acts as the signed-in user, so the database's row-level security and column
// grants decide what each staff member can read or change.
export function userClient(accessToken: string): SupabaseClient {
  if (!databaseConfigured()) throw new HttpError(503, 'The database is not configured on the server.')
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function publicClient(): SupabaseClient {
  if (!databaseConfigured()) throw new HttpError(503, 'The database is not configured on the server.')
  return createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function audit(entry: { actorId?: string; actorEmail?: string; actorRole?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }) {
  const { error } = await serviceClient().from('audit_logs').insert({
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

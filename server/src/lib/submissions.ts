import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type { fileMeta } from '../schemas'
import { HttpError } from './http'

const extensions: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

// Reserves a path in the private bucket and returns a one-time upload token the
// browser uses to send the file straight to storage (the file never passes
// through this server). The bucket itself enforces the type and 5 MB limit.
export async function createUploadSlot(db: SupabaseClient, folder: 'contact' | 'resumes', file: z.infer<typeof fileMeta>) {
  const path = `${folder}/${crypto.randomUUID()}.${extensions[file.type]}`
  const { data, error } = await db.storage.from('submission-files').createSignedUploadUrl(path)
  if (error) throw error
  return { path, token: data.token, name: file.name }
}

// Abuse protection for public forms: a few submissions per email per hour.
// (The API also rate-limits by IP address.)
export async function enforceEmailLimit(db: SupabaseClient, table: string, email: string, limit: number) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await db.from(table).select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since)
  if (error) throw error
  if ((count ?? 0) >= limit) throw new HttpError(429, 'Too many submissions. Please try again later.')
}

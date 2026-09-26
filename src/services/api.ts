import { supabase } from '../lib/supabase'

type UploadSlot = { path: string; token: string } | null

// The API lives at /api on the same origin (Vite proxies it in development).
// Set VITE_API_BASE_URL when the API is hosted on another domain.
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
export const apiUrl = (path: string) => `${apiBase}/api${path}`

// Calls the Iman Logistics API. `auth` sends the signed-in user's Supabase
// access token so staff endpoints can check their role.
export async function api<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth) {
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
    if (!data.session) throw new Error('Your session has ended. Please sign in again.')
    headers.Authorization = `Bearer ${data.session.access_token}`
  }
  let response: Response
  try {
    response = await fetch(apiUrl(path), { method: options.method ?? (options.body === undefined ? 'GET' : 'POST'), headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  } catch {
    throw new Error('The server is unavailable. Please try again later.')
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  let result: (T & { error?: string }) | null = null
  try {
    result = text ? JSON.parse(text) : null
  } catch {
    // A non-JSON reply means the API is not reachable (for example, an HTML fallback page).
  }
  if (!response.ok || result === null) throw new Error(result?.error || 'The server is unavailable. Please try again later.')
  return result
}

// Sends a file straight to private storage using the one-time token from the API.
export async function uploadToSlot(slot: UploadSlot, file?: File) {
  if (!slot || !file) return
  if (!supabase) throw new Error('File uploads are not configured.')
  const { error } = await supabase.storage.from('submission-files').uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type })
  if (error) throw new Error('Your details were received, but the file could not be uploaded.')
}

export const fileMeta = (file?: File) => file ? { name: file.name, type: file.type, size: file.size } : undefined

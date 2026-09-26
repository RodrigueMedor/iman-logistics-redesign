import { supabase } from '../lib/supabase'

type UploadSlot = { path: string; token: string } | null

// Calls a Netlify Function and surfaces its error message on failure.
export async function callFunction<T>(name: string, body: unknown, options: { method?: string; token?: string } = {}): Promise<T> {
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: options.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let result: (T & { error?: string }) | null = null
  try {
    result = text ? JSON.parse(text) : null
  } catch {
    // A non-JSON reply means the function is not deployed (for example, the SPA fallback page).
  }
  if (!response.ok || !result) throw new Error(result?.error || 'The server is unavailable. Please try again later.')
  return result
}

// Sends a file straight to private storage using the one-time token from the server.
export async function uploadToSlot(slot: UploadSlot, file?: File) {
  if (!slot || !file) return
  if (!supabase) throw new Error('File uploads are not configured.')
  const { error } = await supabase.storage.from('submission-files').uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type })
  if (error) throw new Error('Your details were received, but the file could not be uploaded.')
}

export const fileMeta = (file?: File) => file ? { name: file.name, type: file.type, size: file.size } : undefined

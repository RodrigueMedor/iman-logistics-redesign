import { api, fileMeta, uploadToSlot } from './api'

export type ContactPayload = {
  fullName: string
  company?: string
  email: string
  phone: string
  subject: string
  message: string
  preferredMethod: string
  service: string
  consent: boolean
  website?: string
}

export async function submitContact(payload: ContactPayload, attachment?: File) {
  const result = await api<{ reference: string; upload: { path: string; token: string } | null }>('/contact-submissions', { body: { ...payload, attachment: fileMeta(attachment) } })
  await uploadToSlot(result.upload, attachment)
  return result.reference
}

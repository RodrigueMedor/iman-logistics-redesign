import { callFunction, fileMeta, uploadToSlot } from './api'

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
  const result = await callFunction<{ reference: string; upload: { path: string; token: string } | null }>('submit-contact', { ...payload, attachment: fileMeta(attachment) })
  await uploadToSlot(result.upload, attachment)
  return result.reference
}

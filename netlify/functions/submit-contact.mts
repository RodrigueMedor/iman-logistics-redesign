import { z } from 'zod'
import { adminClient, createUploadSlot, enforceRateLimit, handleError, HttpError, json, readJson } from '../lib/server'

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().default(''),
  email: z.email().max(254),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,20}$/),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(20).max(5000),
  preferredMethod: z.string().trim().max(40).default(''),
  service: z.string().trim().max(80).default(''),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot: real visitors never fill this in
  attachment: z.object({ name: z.string().min(1), type: z.string(), size: z.number() }).optional(),
})

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  try {
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'Please check the form fields and try again.')
    const input = parsed.data
    const email = input.email.toLowerCase()
    const client = adminClient()
    await enforceRateLimit(client, 'contact_submissions', email)

    const upload = input.attachment ? await createUploadSlot(client, 'contact', input.attachment) : null
    const { data, error } = await client.from('contact_submissions').insert({
      full_name: input.fullName,
      company: input.company,
      email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      preferred_method: input.preferredMethod,
      service: input.service,
      attachment_path: upload?.path ?? null,
      attachment_name: upload?.name ?? null,
    }).select('reference').single()
    if (error) throw error

    return json({ reference: data.reference, upload: upload && { path: upload.path, token: upload.token } }, 201)
  } catch (error) {
    return handleError(error)
  }
}

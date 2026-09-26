import { z } from 'zod'
import { adminClient, createUploadSlot, enforceRateLimit, handleError, HttpError, json, readJson } from '../lib/server'

const schema = z.object({
  position: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,20}$/),
  location: z.string().trim().max(120).optional().default(''),
  experience: z.string().trim().max(120).optional().default(''),
  coverLetter: z.string().trim().max(5000).optional().default(''),
  website: z.string().max(0).optional(),
  resume: z.object({ name: z.string().min(1), type: z.string(), size: z.number() }).optional(),
})

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  try {
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'Please check the application fields and try again.')
    const input = parsed.data
    const email = input.email.toLowerCase()
    const client = adminClient()
    await enforceRateLimit(client, 'job_applications', email, 3)

    const upload = input.resume ? await createUploadSlot(client, 'resumes', input.resume) : null
    const { data, error } = await client.from('job_applications').insert({
      position: input.position,
      full_name: input.fullName,
      email,
      phone: input.phone,
      location: input.location,
      experience: input.experience,
      cover_letter: input.coverLetter,
      resume_path: upload?.path ?? null,
      resume_name: upload?.name ?? null,
    }).select('reference').single()
    if (error) throw error

    return json({ reference: data.reference, upload: upload && { path: upload.path, token: upload.token } }, 201)
  } catch (error) {
    return handleError(error)
  }
}

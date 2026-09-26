import { z } from 'zod'
import { adminClient, enforceRateLimit, handleError, HttpError, json, readJson } from '../lib/server'
import { consultationSlots, meetingTypes, serviceCatalog } from '../../src/features/consultation/serviceCatalog'

const schema = z.object({
  serviceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string(),
  timeZone: z.string().trim().max(80).default(''),
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,20}$/),
  company: z.string().trim().max(120).optional().default(''),
  meetingType: z.string(),
  message: z.string().trim().min(20).max(5000),
  website: z.string().max(0).optional(),
})

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  try {
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'Please check the booking details and try again.')
    const input = parsed.data

    const service = serviceCatalog.find(item => item.id === input.serviceId)
    if (!service) throw new HttpError(400, 'Select a valid consultation service.')
    if (!(consultationSlots as readonly string[]).includes(input.time)) throw new HttpError(400, 'Select a valid time.')
    if (!(meetingTypes as readonly string[]).includes(input.meetingType)) throw new HttpError(400, 'Select a valid meeting type.')

    const day = new Date(`${input.date}T12:00:00Z`)
    const today = new Date().toISOString().slice(0, 10)
    if (Number.isNaN(day.getTime()) || input.date < today) throw new HttpError(400, 'Select a future date.')
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) throw new HttpError(400, 'Consultations are available Monday to Friday.')

    const email = input.email.toLowerCase()
    const client = adminClient()
    await enforceRateLimit(client, 'consultation_bookings', email, 3)

    const { data, error } = await client.from('consultation_bookings').insert({
      service_id: service.id,
      service_name: service.name,
      duration_minutes: service.duration,
      price_cents: service.price * 100,
      booking_date: input.date,
      booking_time: input.time,
      time_zone: input.timeZone,
      full_name: input.fullName,
      email,
      phone: input.phone,
      company: input.company,
      meeting_type: input.meetingType,
      message: input.message,
    }).select('reference').single()
    if (error?.code === '23505') throw new HttpError(409, 'That time was just booked. Please choose another time.')
    if (error) throw error

    return json({ reference: data.reference }, 201)
  } catch (error) {
    return handleError(error)
  }
}

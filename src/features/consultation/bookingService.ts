import type { Dayjs } from 'dayjs'
import type { ConsultationService } from './consultationData'

export type BookingPayload = {
  service: ConsultationService
  date: Dayjs
  time: string
  timeZone: string
  fullName: string
  email: string
  phone: string
  company?: string
  meetingType: string
  message: string
}

export async function createBooking(_payload: BookingPayload) {
  await new Promise(resolve => setTimeout(resolve, 900))
  return { reference: `IMAN-${crypto.randomUUID().slice(0, 8).toUpperCase()}` }
}


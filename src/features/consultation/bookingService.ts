import type { Dayjs } from 'dayjs'
import { isSupabaseConfigured } from '../../lib/supabase'
import { api } from '../../services/api'
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

export async function createBooking(payload: BookingPayload) {
  const { service, date, ...details } = payload
  return api<{ reference: string; paymentRequired: boolean }>('/bookings', { body: { ...details, serviceId: service.id, date: date.format('YYYY-MM-DD') } })
}

export async function getBookedSlots(date: Dayjs): Promise<string[]> {
  if (!isSupabaseConfigured) return []
  try {
    const result = await api<{ bookedTimes: string[] }>(`/bookings/availability?date=${date.format('YYYY-MM-DD')}`)
    return result.bookedTimes
  } catch {
    return []
  }
}

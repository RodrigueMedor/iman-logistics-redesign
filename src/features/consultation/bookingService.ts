import type { Dayjs } from 'dayjs'
import { supabase } from '../../lib/supabase'
import { callFunction } from '../../services/api'
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
  return callFunction<{ reference: string }>('submit-booking', { ...details, serviceId: service.id, date: date.format('YYYY-MM-DD') })
}

export async function getBookedSlots(date: Dayjs): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('consultation_booked_slots', { p_date: date.format('YYYY-MM-DD') })
  if (error) return []
  return (data as string[] | null) ?? []
}

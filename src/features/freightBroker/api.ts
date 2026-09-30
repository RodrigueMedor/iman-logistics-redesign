import { api } from '../../services/api'

// Freight Dispatch Masterclass registration calls (the school's src/lib/stripe.ts
// createDispatcherRegistration / createDispatcherCheckout / getPaymentStatus).

export type BrokerClass = {
  id: string
  name: string
  description?: string | null
  price_cents?: number
  starts_at?: string
  ends_at?: string
  registration_deadline?: string | null
  days_of_week?: string | null
  class_time?: string | null
  delivery_mode?: 'online' | 'in_person' | null
  location?: string | null
  instructor_name?: string | null
  seat_capacity?: number | null
  seats_remaining?: number | null
  status?: 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED'
  timezone?: string
  allows_online?: boolean
  allows_in_person?: boolean
}

export type RegistrationForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  classId: string
  attendanceType: 'online' | 'in_person'
  verificationId: string
  verificationToken: string
}

export type CreatedRegistration = { id: string; registration_no: string; class_id: string }

export type RegistrationDetails = {
  id: string
  registrationNo: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address?: string
  city?: string
  state?: string
  zip?: string
  className: string
  classStartsAt?: string | null
  classEndsAt?: string | null
  classDaysOfWeek?: string | null
  classTime?: string | null
  classDeliveryMode?: 'online' | 'in_person' | null
  classLocation?: string | null
  classInstructor?: string | null
  classTimezone?: string | null
  attendanceType?: 'online' | 'in_person'
  emailVerified?: boolean
  phoneVerified?: boolean
  status: string
  paymentStatus: string
  policyAccepted: boolean
  policySignature?: string | null
  policyAcceptedAt?: string | null
  policyVersion?: string | null
  policyText?: string
}

export type RegistrationPaymentStatus = {
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded'
  payment_type?: string
  amount_cents?: number
  currency?: string
  registration?: RegistrationDetails | null
}

export const listBrokerClasses = () => api<BrokerClass[]>('/freight-broker/classes')

export type VerificationState = { id: string; email: string; phone: string; phoneVerificationRequired?: boolean; expiresInSeconds: number }
export type VerificationResult = { emailVerified: boolean; phoneVerified: boolean; verificationToken?: string; tokenExpiresAt?: string }
export const startRegistrationVerification = (email: string, phone: string) =>
  api<VerificationState>('/freight-broker/verifications', { body: { email, phone } })
export const verifyRegistrationCode = (id: string, channel: 'email' | 'phone', code: string) =>
  api<VerificationResult>(`/freight-broker/verifications/${id}/verify`, { body: { channel, code } })
export const resendRegistrationCode = (id: string, channel: 'email' | 'phone') =>
  api(`/freight-broker/verifications/${id}/resend`, { body: { channel } })

export const createBrokerRegistration = (form: RegistrationForm & { website?: string }) =>
  api<CreatedRegistration>('/freight-broker/registrations', { body: form })

export async function startBrokerCheckout(registration: CreatedRegistration, email: string, signature: string) {
  const { url } = await api<{ sessionId: string; url: string | null }>(`/freight-broker/registrations/${registration.id}/checkout`, {
    body: { email, classId: registration.class_id, paymentPolicyAccepted: true, paymentPolicySignature: signature },
  })
  if (!url) throw new Error('Checkout session not returned. Please try again.')
  window.location.assign(url)
}

export const getBrokerPaymentStatus = (sessionId: string) =>
  api<RegistrationPaymentStatus>(`/payments/status?session_id=${encodeURIComponent(sessionId)}`)

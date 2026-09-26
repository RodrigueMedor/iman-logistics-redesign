// Shared by the website and the API server, so the server sets
// prices and valid time slots instead of trusting the browser.
export const serviceCatalog = [
  { id: 'brokerage', name: 'Freight Brokerage Consultation', duration: 60, price: 149 },
  { id: 'trucking', name: 'Trucking Business Consultation', duration: 60, price: 149 },
  { id: 'dispatch', name: 'Dispatch Services Consultation', duration: 45, price: 119 },
  { id: 'cdl', name: 'CDL School Consultation', duration: 30, price: 79 },
] as const

export const consultationSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:30 PM', '4:00 PM'] as const

export const meetingTypes = ['Google Meet', 'Zoom', 'Microsoft Teams', 'Phone Call', 'In Person'] as const

// Shown before checkout and on Stripe's payment page. Confirm this wording
// with the business before accepting live payments.
export const bookingPaymentPolicyVersion = 'v1-consultation-prepaid'
export const bookingPaymentPolicyText =
  'Consultation fees are paid in advance to reserve your appointment time. To reschedule or ask about a refund, contact Iman Logistics before your appointment.'

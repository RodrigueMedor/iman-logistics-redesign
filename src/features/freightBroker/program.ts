// Freight Dispatch Masterclass registration — adapted from the Iman Trucking
// School Dispatcher Class Registration. Shared by the website and the API so
// labels, IDs, and the signed policy text stay identical on both sides.

export const FREIGHT_BROKER_PROGRAM = {
  id: 'freight_broker_masterclass',
  name: 'Freight Dispatch Masterclass',
  registrationPrefix: 'FBM',
  defaultClassName: 'Freight Dispatch Masterclass',
  // Fallback shown only until the live class sessions load.
  defaultPriceCents: 52000,
} as const

// Bumped when the course was renamed, so signatures record the wording shown.
export const FREIGHT_BROKER_POLICY_VERSION = 'v2-freight-dispatch-nonrefundable-credit'

// Same wording as the live Dispatcher Class Registration policy, for the
// Freight Dispatch Masterclass. Confirm it with the business before going live.
export const FREIGHT_BROKER_POLICY_TEXT =
  'All registration payments are non-refundable. If the student cannot attend the class, the payment remains as a credit on their student account and can be used for a future Freight Dispatch Masterclass session.'

export const FREIGHT_BROKER_POLICY_CHECKBOX =
  'I have read and agree to the Freight Dispatch Masterclass Registration Policy: All registration payments are non-refundable. If I cannot attend the class, my payment remains as a credit on my student account and can be used for a future Freight Dispatch Masterclass session.'

// Optional SMS consent for payment reminders. The exact wording the student
// agreed to is stored with the registration. Never a condition of purchase.
export const FREIGHT_BROKER_SMS_CONSENT_TEXT =
  'Text me payment reminders about this registration from IMAN Logistics at the phone number above, up to one message per day while my payment is pending. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Consent is not a condition of registration.'

export const FREIGHT_BROKER_STEPS =['Your information', 'Review & policy', 'Confirmation'] as const

export const normalizePersonName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
export const expectedSignatureName = (firstName: string, lastName: string) => `${firstName} ${lastName}`.trim()

export function isPolicySigned(accepted: boolean, signature: string, firstName: string, lastName: string) {
  const expected = normalizePersonName(expectedSignatureName(firstName, lastName))
  return accepted && Boolean(expected) && normalizePersonName(signature) === expected
}

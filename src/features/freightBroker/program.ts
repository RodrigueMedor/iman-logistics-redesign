// Freight Broker Masterclass registration — adapted from the Iman Trucking
// School Dispatcher Class Registration. Shared by the website and the API so
// labels, IDs, and the signed policy text stay identical on both sides.

export const FREIGHT_BROKER_PROGRAM = {
  id: 'freight_broker_masterclass',
  name: 'Freight Broker Masterclass',
  registrationPrefix: 'FBM',
  defaultClassName: 'Freight Broker Masterclass',
  // Fallback shown only until the live class sessions load.
  defaultPriceCents: 52000,
} as const

export const FREIGHT_BROKER_POLICY_VERSION = 'v1-freight-broker-nonrefundable-credit'

// Same wording as the live Dispatcher Class Registration policy, for the
// Freight Broker Masterclass. Confirm it with the business before going live.
export const FREIGHT_BROKER_POLICY_TEXT =
  'All registration payments are non-refundable. If the student cannot attend the class, the payment remains as a credit on their student account and can be used for a future Freight Broker Masterclass session.'

export const FREIGHT_BROKER_POLICY_CHECKBOX =
  'I have read and agree to the Freight Broker Masterclass Registration Policy: All registration payments are non-refundable. If I cannot attend the class, my payment remains as a credit on my student account and can be used for a future Freight Broker Masterclass session.'

export const FREIGHT_BROKER_STEPS = ['Your information', 'Review & policy', 'Confirmation'] as const

export const normalizePersonName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
export const expectedSignatureName = (firstName: string, lastName: string) => `${firstName} ${lastName}`.trim()

export function isPolicySigned(accepted: boolean, signature: string, firstName: string, lastName: string) {
  const expected = normalizePersonName(expectedSignatureName(firstName, lastName))
  return accepted && Boolean(expected) && normalizePersonName(signature) === expected
}

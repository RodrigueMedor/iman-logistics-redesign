// Iman Logistics masterclass registration programs. Both programs share one
// registration flow (verification → review & signed policy → Stripe Checkout),
// one set of tables (told apart by their `program` column), and one back office.
// Shared by the website and the API so labels, IDs, and the signed policy text
// stay identical on both sides.

export const MASTERCLASS_PROGRAM_IDS = ['dispatch_masterclass', 'broker_masterclass'] as const
export type MasterclassProgramId = typeof MASTERCLASS_PROGRAM_IDS[number]

export type MasterclassProgram = {
  id: MasterclassProgramId
  name: string
  shortName: string
  registrationPrefix: string
  defaultClassName: string
  // Fallback shown only until the live class sessions load.
  defaultPriceCents: number
  // Public page and back-office paths (trailing slash, like every site route).
  path: string
  adminPath: string
  // Bumped whenever the policy wording changes, so signatures record what was shown.
  policyVersion: string
  policyText: string
  policyCheckbox: string
  smsConsentText: string
  // Shown on the form until a session with its own description is selected.
  defaultDescription: string
  // Enrollment phone line shown beside the registration form, when there is one.
  phone?: string
}

const policyText = (name: string) =>
  `All registration payments are non-refundable. If the student cannot attend the class, the payment remains as a credit on their student account and can be used for a future ${name} session.`
const policyCheckbox = (name: string) =>
  `I have read and agree to the ${name} Registration Policy: All registration payments are non-refundable. If I cannot attend the class, my payment remains as a credit on my student account and can be used for a future ${name} session.`
// Optional SMS consent for payment reminders. The exact wording the student
// agreed to is stored with the registration. Never a condition of purchase.
const SMS_CONSENT_TEXT =
  'Text me payment reminders and a payment confirmation about this registration from IMAN Logistics at the phone number above. Reminders are sent up to once per day while my payment is pending. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Consent is not a condition of registration.'

export const MASTERCLASS_PROGRAMS: Record<MasterclassProgramId, MasterclassProgram> = {
  dispatch_masterclass: {
    id: 'dispatch_masterclass',
    name: 'Freight Dispatch Masterclass',
    shortName: 'Dispatch Masterclass',
    registrationPrefix: 'FBM',
    defaultClassName: 'Freight Dispatch Masterclass',
    defaultPriceCents: 52000,
    path: '/freight-dispatch-masterclass/',
    adminPath: '/admin/dispatch-masterclass/',
    policyVersion: 'v2-freight-dispatch-nonrefundable-credit',
    policyText: policyText('Freight Dispatch Masterclass'),
    policyCheckbox: policyCheckbox('Freight Dispatch Masterclass'),
    smsConsentText: SMS_CONSENT_TEXT,
    defaultDescription: 'Learn how to dispatch freight from start to finish: finding loads, carrier setup and paperwork, rate negotiation, compliance, and managing multiple trucks. Choose a session from the list to see its price.',
  },
  broker_masterclass: {
    id: 'broker_masterclass',
    name: 'Freight Broker Master Class',
    shortName: 'Broker Master Class',
    registrationPrefix: 'FBR',
    defaultClassName: 'Freight Broker Master Class',
    defaultPriceCents: 52000,
    path: '/freight-broker-masterclass/',
    adminPath: '/admin/broker-masterclass/',
    policyVersion: 'v1-freight-broker-nonrefundable-credit',
    policyText: policyText('Freight Broker Master Class'),
    policyCheckbox: policyCheckbox('Freight Broker Master Class'),
    smsConsentText: SMS_CONSENT_TEXT,
    phone: '888-991-4776',
    defaultDescription: 'A one-month program: the first week is live on Zoom, followed by workshops where you practice setting up a brokerage and moving freight. Broker setup, surety bonds, load boards and carrier vetting, credit checks and factoring, and sales and daily operations. Choose a session from the list to see its price.',
  },
}

export const isMasterclassProgram = (value: unknown): value is MasterclassProgramId =>
  typeof value === 'string' && (MASTERCLASS_PROGRAM_IDS as readonly string[]).includes(value)

// Rows created before the Broker Master Class existed have no program; they
// belong to the Dispatch Masterclass.
export const masterclassProgram = (id?: string | null): MasterclassProgram =>
  MASTERCLASS_PROGRAMS[isMasterclassProgram(id) ? id : 'dispatch_masterclass']

// Original single-program exports, kept for the Dispatch Masterclass.
export const FREIGHT_BROKER_PROGRAM = MASTERCLASS_PROGRAMS.dispatch_masterclass
export const FREIGHT_BROKER_POLICY_VERSION = FREIGHT_BROKER_PROGRAM.policyVersion
export const FREIGHT_BROKER_POLICY_TEXT = FREIGHT_BROKER_PROGRAM.policyText
export const FREIGHT_BROKER_POLICY_CHECKBOX = FREIGHT_BROKER_PROGRAM.policyCheckbox
export const FREIGHT_BROKER_SMS_CONSENT_TEXT = SMS_CONSENT_TEXT

export const FREIGHT_BROKER_STEPS = ['Your information', 'Review & policy', 'Confirmation'] as const

export const normalizePersonName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
export const expectedSignatureName = (firstName: string, lastName: string) => `${firstName} ${lastName}`.trim()

export function isPolicySigned(accepted: boolean, signature: string, firstName: string, lastName: string) {
  const expected = normalizePersonName(expectedSignatureName(firstName, lastName))
  return accepted && Boolean(expected) && normalizePersonName(signature) === expected
}

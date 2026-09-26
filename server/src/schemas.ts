import { z } from 'zod'
import { consultationSlots, meetingTypes, serviceCatalog } from '../../src/features/consultation/serviceCatalog'

// Request schemas. Each one validates requests AND generates the OpenAPI
// (Swagger) documentation, so the docs cannot drift from the code.

const phone = z.string().trim().regex(/^[+()\d\s.-]{7,20}$/, 'Enter a valid phone number').meta({ example: '+1 555 010 2000' })
const email = z.email('Enter a valid email address').max(254).meta({ example: 'jordan@example.com' })
const honeypot = z.string().max(0).optional().meta({ description: 'Leave empty. Bots that fill it in are rejected.' })
export const fileMeta = z.object({
  name: z.string().min(1).max(200).meta({ example: 'notes.pdf' }),
  type: z.enum(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'], 'File must be a PDF, DOC, DOCX, PNG, or JPG.'),
  size: z.number().int().positive().max(5 * 1024 * 1024, 'File must be 5 MB or smaller.').meta({ example: 20480 }),
}).meta({ description: 'Describe the file; the reply includes a one-time token for uploading it straight to private storage.' })

export const contactSubmission = z.object({
  fullName: z.string().trim().min(2).max(120).meta({ example: 'Jordan Customer' }),
  company: z.string().trim().max(120).optional().default(''),
  email,
  phone,
  subject: z.string().trim().min(3).max(200).meta({ example: 'Dispatch training question' }),
  message: z.string().trim().min(20, 'Please provide at least 20 characters').max(5000).meta({ example: 'I would like to know more about the dispatch masterclass schedule.' }),
  preferredMethod: z.string().trim().max(40).default('').meta({ example: 'Email' }),
  service: z.string().trim().max(80).default('').meta({ example: 'Freight Dispatch Masterclass' }),
  consent: z.literal(true, 'Please confirm that we may contact you'),
  website: honeypot,
  attachment: fileMeta.optional(),
}).meta({ id: 'ContactSubmissionInput' })

export const booking = z.object({
  serviceId: z.enum(serviceCatalog.map(item => item.id) as [string, ...string[]], 'Select a valid consultation service.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).meta({ example: '2026-10-05', description: 'A future weekday (YYYY-MM-DD).' }),
  time: z.enum(consultationSlots, 'Select a valid time.'),
  timeZone: z.string().trim().max(80).default('').meta({ example: 'America/New_York' }),
  fullName: z.string().trim().min(2).max(120).meta({ example: 'Jordan Customer' }),
  email,
  phone,
  company: z.string().trim().max(120).optional().default(''),
  meetingType: z.enum(meetingTypes, 'Select a valid meeting type.'),
  message: z.string().trim().min(20, 'Please provide at least 20 characters').max(5000),
  website: honeypot,
}).meta({ id: 'BookingInput' })

export const bookingCheckout = z.object({
  email: email.meta({ description: 'Must match the booking.' }),
  paymentPolicyAccepted: z.literal(true, 'Please accept the payment policy before checkout.'),
  paymentPolicySignature: z.string().trim().min(2).max(120).meta({ description: 'Full name exactly as entered on the booking.', example: 'Jordan Customer' }),
}).meta({ id: 'BookingCheckoutInput' })

export const jobApplication = z.object({
  position: z.string().trim().min(2).max(120).meta({ example: 'CDL Class-A Driver' }),
  fullName: z.string().trim().min(2).max(120),
  email,
  phone,
  location: z.string().trim().max(120).optional().default(''),
  experience: z.string().trim().max(120).optional().default(''),
  coverLetter: z.string().trim().max(5000).optional().default(''),
  website: honeypot,
  resume: fileMeta.optional(),
}).meta({ id: 'JobApplicationInput' })

export const passwordReset = z.object({ email }).meta({ id: 'PasswordResetInput' })

export const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.string().max(40).optional(),
  payment_status: z.string().max(40).optional(),
  method: z.string().max(40).optional(),
  entity_type: z.string().max(60).optional(),
})

export const recordUpdate = z.object({
  status: z.string().max(40).optional(),
  payment_status: z.string().max(40).optional(),
  admin_notes: z.string().max(5000).optional(),
}).refine(value => Object.keys(value).length > 0, 'Nothing to update.').meta({ id: 'RecordUpdateInput', description: 'Staff can change only status fields and internal notes.' })

export const paymentInput = z.object({
  payer_name: z.string().trim().min(2).max(120),
  payer_email: z.union([z.email().max(254), z.literal('')]).default(''),
  description: z.string().trim().max(300).default(''),
  amount_cents: z.number().int().min(0).max(100_000_000),
  currency: z.string().regex(/^[A-Za-z]{3}$/).default('USD'),
  method: z.enum(['card', 'cash', 'check', 'zelle', 'bank_transfer', 'intuit', 'other']).default('card'),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']).default('paid'),
  provider_reference: z.string().trim().max(200).default(''),
  booking_reference: z.string().trim().max(40).optional().meta({ description: 'Links the payment to a consultation booking.' }),
  admin_notes: z.string().max(5000).optional(),
}).meta({ id: 'PaymentInput', description: 'A payment recorded by staff (cash, Zelle, check…). Stripe payments are created by checkout.' })

const trackingEvent = z.object({ label: z.string().max(80), location: z.string().max(120), timestamp: z.string().max(80), completed: z.boolean(), detail: z.string().max(300) })
export const shipmentInput = z.object({
  reference: z.string().trim().toUpperCase().min(3).max(40).meta({ example: 'IMAN-13579' }),
  status: z.enum(['Pending pickup', 'In transit', 'Delivered', 'Exception']),
  origin: z.string().trim().min(1).max(120),
  destination: z.string().trim().min(1).max(120),
  estimatedDelivery: z.string().trim().max(120).default(''),
  progress: z.number().int().min(0).max(100),
  events: z.array(trackingEvent).max(20).default([]),
  customer: z.string().trim().max(120).default(''),
  carrier: z.string().trim().max(120).default(''),
  internalNotes: z.string().max(5000).default(''),
}).meta({ id: 'ShipmentInput' })

export const userCreate = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  password: z.string().min(10, 'Passwords must be at least 10 characters.').max(128),
  role: z.enum(['employee', 'admin']).default('employee'),
}).meta({ id: 'UserCreateInput' })

export const userUpdate = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.email().max(254).optional(),
  password: z.string().min(10, 'Passwords must be at least 10 characters.').max(128).optional(),
  active: z.boolean().optional(),
  role: z.enum(['employee', 'admin']).optional(),
}).meta({ id: 'UserUpdateInput' })

// Accepts ISO timestamps and datetime-local values ("2026-07-25T10:00").
const isoDateTime = z.union([z.string().max(40).refine(value => !Number.isNaN(Date.parse(value)), 'Invalid date and time'), z.null()]).default(null)
const workOrderNote = z.object({ id: z.string().max(80), author: z.string().max(160), message: z.string().max(5000), createdAt: z.string().max(80), kind: z.enum(['Progress note', 'Completion comment']) })
const workOrderEvent = z.object({ id: z.string().max(80), status: z.string().max(40), actor: z.string().max(160), createdAt: z.string().max(80), detail: z.string().max(500).optional() })
const workOrderStatus = z.enum(['Open', 'In progress', 'Blocked', 'Pending approval', 'Completed'])

export const workOrderInput = z.object({
  work_order_number: z.string().trim().min(1).max(40).meta({ example: 'WO-1003' }),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  assignee_id: z.uuid(),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  status: workOrderStatus,
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shipment_reference: z.string().trim().max(40).default(''),
  pickup_location: z.string().trim().max(200).default(''),
  destination: z.string().trim().max(200).default(''),
  delivery_appointment: isoDateTime,
  actual_delivery_at: isoDateTime,
  started_at: isoDateTime,
  blocked_at: isoDateTime,
  completed_at: isoDateTime,
  completion_submitted_at: isoDateTime,
  resolution_summary: z.string().max(5000).default(''),
  notes: z.array(workOrderNote).max(500).default([]),
  status_history: z.array(workOrderEvent).max(500).default([]),
}).meta({ id: 'WorkOrderInput' })

export const workOrderProgress = z.object({
  status: workOrderStatus.exclude(['Completed']),
  notes: z.array(workOrderNote).max(500),
  statusHistory: z.array(workOrderEvent).max(500),
  resolutionSummary: z.string().max(5000).default(''),
}).meta({ id: 'WorkOrderProgressInput', description: 'Employees may add notes and history entries, never change existing ones.' })

export const siteContentInput = z.object({
  page: z.string().trim().min(1).max(80).meta({ example: 'home' }),
  section_key: z.string().trim().min(1).max(80).meta({ example: 'custom-spring-offer' }),
  section_label: z.string().max(200).default(''),
  title: z.string().max(500).default(''),
  body: z.string().max(10000).default(''),
  image_url: z.string().max(1000).default(''),
  button_text: z.string().max(120).default(''),
  button_url: z.string().max(1000).default(''),
  layout: z.enum(['text', 'image-right', 'image-left']).default('text'),
  sort_order: z.number().int().min(0).max(100000).default(100),
  published: z.boolean().default(true),
}).meta({ id: 'SiteContentInput' })

export const imageUpload = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'], 'Images must be PNG, JPG, WEBP, GIF, or AVIF.'),
  size: z.number().int().positive().max(5 * 1024 * 1024, 'Images must be 5 MB or smaller.'),
}).meta({ id: 'ImageUploadInput' })

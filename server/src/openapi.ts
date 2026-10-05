import { z } from 'zod'
import * as schemas from './schemas'

type Json = Record<string, unknown>

// Request bodies come straight from the zod schemas used for validation.
const body = (schema: z.ZodType): Json => {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Json
  return { required: true, content: { 'application/json': { schema: jsonSchema } } }
}

const error = { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
const ok = (description: string, schema: Json = { type: 'object' }) => ({ description, content: { 'application/json': { schema } } })
const errors = (...codes: number[]) => Object.fromEntries(codes.map(code => [String(code), error]))
const pathParam = (name: string, description: string, example?: string) => ({ name, in: 'path', required: true, description, schema: { type: 'string', ...(example ? { example } : {}) } })
const queryParam = (name: string, description: string, schema: Json = { type: 'string' }, required = false) => ({ name, in: 'query', required, description, schema })
const secured = [{ bearerAuth: [] }]

const referenceReply = { type: 'object', properties: { reference: { type: 'string', example: 'MSG-2609-A1B2C3' }, upload: { $ref: '#/components/schemas/UploadSlot' } } }
const listParams = [
  queryParam('search', 'Free-text search across the resource’s main fields.'),
  queryParam('page', '1-based page number.', { type: 'integer', minimum: 1, default: 1 }),
  queryParam('pageSize', 'Rows per page (max 100).', { type: 'integer', minimum: 1, maximum: 100, default: 25 }),
  queryParam('status', 'Filter by status (contact submissions, bookings, applications, payments).'),
  queryParam('payment_status', 'Filter bookings by payment status.'),
  queryParam('method', 'Filter payments by method.'),
  queryParam('entity_type', 'Filter audit logs by record type.'),
  queryParam('channel', 'Filter the notification log by channel (email, sms).'),
]
const resourceParam = { name: 'resource', in: 'path', required: true, schema: { type: 'string', enum: ['contact-submissions', 'bookings', 'job-applications', 'freight-broker-registrations', 'payments', 'customers', 'notification-log', 'audit-logs'] }, description: '`audit-logs` requires super_admin. `customers` is read-only and keyed by email.' }

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Iman Logistics API',
    version: '1.0.0',
    description: [
      'Backend for the Iman Logistics website and back office.',
      '',
      '**Public** endpoints accept website form submissions. **Admin** endpoints require a Supabase access token for an active `super_admin` or `admin` profile (`employee` accounts use the work-order portal).',
      '',
      'To try admin endpoints here: sign in on the website, copy `access_token` from the Supabase session (browser devtools → Application → Local storage → `sb-…-auth-token`), then press **Authorize**.',
    ].join('\n'),
  },
  servers: [{ url: '/api', description: 'This server' }],
  tags: [
    { name: 'Health' },
    { name: 'Website forms', description: 'Public submissions from the website.' },
    { name: 'Bookings & payments', description: 'Consultation booking and Stripe Checkout.' },
    { name: 'Freight Broker Masterclass', description: 'Registration, signed policy, and Stripe Checkout (adapted from Dispatcher Class Registration).' },
    { name: 'Tracking' },
    { name: 'Auth' },
    { name: 'Back office', description: 'Records, dashboard statistics, and files. Staff only.' },
    { name: 'Shipments', description: 'Shipment records behind public tracking. Staff only.' },
    { name: 'Users', description: 'Staff accounts and roles. Super admin only.' },
    { name: 'Work orders', description: 'Super admins manage work orders; employees update the ones assigned to them.' },
    { name: 'Website content', description: 'CMS sections shown on the public pages.' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Supabase JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
      UploadSlot: { type: ['object', 'null'], description: 'Upload the file with supabase.storage.from("submission-files").uploadToSignedUrl(path, token, file).', properties: { path: { type: 'string' }, token: { type: 'string' } } },
      Page: { type: 'object', properties: { data: { type: 'array', items: { type: 'object' } }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } },
    },
  },
  paths: {
    '/health': { get: { tags: ['Health'], summary: 'Service health and configuration', responses: { 200: ok('Status', { type: 'object', properties: { status: { type: 'string' }, database: { type: 'boolean' }, stripe: { type: 'boolean' }, stripeWebhook: { type: 'boolean' } } }) } } },
    '/public-config': { get: { tags: ['Health'], summary: 'Features the website can use', responses: { 200: ok('Config', { type: 'object', properties: { onlinePayments: { type: 'boolean', description: 'True when Stripe Checkout is available.' } } }) } } },
    '/contact-submissions': { post: { tags: ['Website forms'], summary: 'Submit the Contact Us form', requestBody: body(schemas.contactSubmission), responses: { 201: ok('Saved', referenceReply), ...errors(400, 429) } } },
    '/job-applications': { post: { tags: ['Website forms'], summary: 'Submit a Careers application', requestBody: body(schemas.jobApplication), responses: { 201: ok('Saved', referenceReply), ...errors(400, 429) } } },
    '/bookings/availability': { get: { tags: ['Bookings & payments'], summary: 'Times already taken on a day', parameters: [queryParam('date', 'YYYY-MM-DD', { type: 'string', example: '2026-10-05' }, true)], responses: { 200: ok('Taken times', { type: 'object', properties: { date: { type: 'string' }, bookedTimes: { type: 'array', items: { type: 'string' } } } }), ...errors(400) } } },
    '/bookings': { post: { tags: ['Bookings & payments'], summary: 'Book a consultation', description: 'The price comes from the server’s service catalog. When Stripe is configured, `paymentRequired` is true and the client should start checkout.', requestBody: body(schemas.booking), responses: { 201: ok('Booked', { type: 'object', properties: { reference: { type: 'string', example: 'BKG-2609-A1B2C3' }, paymentRequired: { type: 'boolean' } } }), ...errors(400, 409, 429) } } },
    '/bookings/{reference}/checkout': { post: { tags: ['Bookings & payments'], summary: 'Start Stripe Checkout for a booking', description: 'Creates a pending payment and a Stripe Checkout Session (expires in 30 minutes). Redirect the customer to `url`.', parameters: [pathParam('reference', 'Booking reference', 'BKG-2609-A1B2C3')], requestBody: body(schemas.bookingCheckout), responses: { 200: ok('Checkout session', { type: 'object', properties: { sessionId: { type: 'string' }, url: { type: 'string' } } }), ...errors(400, 404, 409, 503) } } },
    '/payments/status': { get: { tags: ['Bookings & payments'], summary: 'Payment status after returning from Stripe', parameters: [queryParam('session_id', 'Stripe Checkout Session id (cs_…)', { type: 'string' }, true)], responses: { 200: ok('Status'), ...errors(400, 404) } } },
    '/stripe/webhook': { post: { tags: ['Bookings & payments'], summary: 'Stripe webhook receiver', description: 'Called by Stripe only. Verified with the `Stripe-Signature` header and `STRIPE_WEBHOOK_SECRET`. Also available at `/stripe-webhook`.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: ok('Received'), ...errors(400, 500) } } },
    '/freight-broker/classes': { get: { tags: ['Freight Broker Masterclass'], summary: 'Open, upcoming class sessions with seats remaining', responses: { 200: ok('Class sessions', { type: 'array', items: { type: 'object' } }) } } },
    '/freight-broker/verifications': { post: { tags: ['Freight Broker Masterclass'], summary: 'Send email and SMS registration codes', requestBody: body(schemas.registrationVerificationStart), responses: { 201: ok('Verification challenge'), ...errors(400, 429, 503) } } },
    '/freight-broker/verifications/{id}/verify': { post: { tags: ['Freight Broker Masterclass'], summary: 'Verify one registration contact channel', parameters: [pathParam('id', 'Verification id')], requestBody: body(schemas.registrationVerificationCode), responses: { 200: ok('Verification state'), ...errors(400, 404, 410, 429) } } },
    '/freight-broker/verifications/{id}/resend': { post: { tags: ['Freight Broker Masterclass'], summary: 'Resend a registration verification code', parameters: [pathParam('id', 'Verification id')], requestBody: body(schemas.registrationVerificationResend), responses: { 200: ok('Resent'), ...errors(404, 429, 503) } } },
    '/freight-broker/registrations': { post: { tags: ['Freight Broker Masterclass'], summary: 'Register (step 1 of 2)', description: 'Creates a SUBMITTED registration with payment pending. Returns the id used for checkout.', requestBody: body(schemas.freightBrokerRegistration), responses: { 201: ok('Registration', { type: 'object', properties: { id: { type: 'string' }, registration_no: { type: 'string', example: 'FBM-2026-MG7X2ABC123' }, class_id: { type: 'string' } } }), ...errors(400, 404, 429) } } },
    '/freight-broker/registrations/{id}/checkout': { post: { tags: ['Freight Broker Masterclass'], summary: 'Sign the policy and start Stripe Checkout (step 2 of 2)', description: 'Checks the email, class, seats, and signature; charges the class price stored on the server. On payment the webhook confirms the registration and sends the email and SMS notifications.', parameters: [pathParam('id', 'Registration id')], requestBody: body(schemas.freightBrokerCheckout), responses: { 200: ok('Checkout session', { type: 'object', properties: { sessionId: { type: 'string' }, url: { type: 'string' } } }), ...errors(400, 404, 409, 503) } } },
    '/admin/freight-broker/classes': {
      get: { tags: ['Freight Broker Masterclass'], summary: 'All class sessions with seat counts (staff)', security: secured, responses: { 200: ok('Class sessions', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } },
      post: { tags: ['Freight Broker Masterclass'], summary: 'Create a class session (staff)', security: secured, requestBody: body(schemas.freightBrokerClassInput), responses: { 201: ok('Class session'), ...errors(400, 401, 403) } },
    },
    '/admin/freight-broker/classes/{id}': {
      put: { tags: ['Freight Broker Masterclass'], summary: 'Update a class session (staff)', security: secured, parameters: [pathParam('id', 'Class id')], requestBody: body(schemas.freightBrokerClassInput), responses: { 200: ok('Class session'), ...errors(400, 401, 403, 404) } },
      delete: { tags: ['Freight Broker Masterclass'], summary: 'Delete a class session (super admin)', security: secured, parameters: [pathParam('id', 'Class id')], responses: { 204: { description: 'Deleted' }, ...errors(401, 403, 404) } },
    },
    '/admin/freight-broker/registrations/{id}/payment-reminders': { get: { tags: ['Freight Broker Masterclass'], summary: 'SMS payment reminder schedule, history, and opt-out state (staff)', security: secured, parameters: [pathParam('id', 'Registration id')], responses: { 200: ok('Payment reminders'), ...errors(401, 403, 404) } } },
    '/twilio/status': { post: { tags: ['Twilio'], summary: 'Twilio message status callback (signed by Twilio)', responses: { 204: { description: 'Recorded' }, ...errors(403, 503) } } },
    '/twilio/inbound': { post: { tags: ['Twilio'], summary: 'Incoming SMS: records STOP/START opt-outs (signed by Twilio)', responses: { 200: { description: 'Empty TwiML' }, ...errors(403, 503) } } },
    '/internal/payment-reminders/run': { post: { tags: ['Twilio'], summary: 'Run due SMS payment reminders now (Bearer PAYMENT_REMINDER_CRON_SECRET)', responses: { 200: ok('Run totals'), ...errors(401, 404) } } },
    '/admin/freight-broker/registrations/{id}/notifications': { get: { tags: ['Freight Broker Masterclass'], summary: 'Emails and SMS sent for a registration (staff)', security: secured, parameters: [pathParam('id', 'Registration id')], responses: { 200: ok('Notifications', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } } },
    '/tracking/{reference}': { get: { tags: ['Tracking'], summary: 'Public shipment tracking', description: 'Returns customer-safe fields only.', parameters: [pathParam('reference', 'Tracking reference', 'IMAN-12345')], responses: { 200: ok('Shipment'), ...errors(404) } } },
    '/auth/password-reset': { post: { tags: ['Auth'], summary: 'Request a super-admin password reset email', description: 'Always returns the same reply, whether or not the account exists.', requestBody: body(schemas.passwordReset), responses: { 200: ok('Accepted'), ...errors(400, 429) } } },

    '/site-content': { get: { tags: ['Website content'], summary: 'Published website content sections', responses: { 200: ok('Sections', { type: 'array', items: { type: 'object' } }) } } },
    '/admin/site-content': {
      get: { tags: ['Website content'], summary: 'All sections, including unpublished (super admin)', security: secured, responses: { 200: ok('Sections', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } },
      post: { tags: ['Website content'], summary: 'Create a section', security: secured, requestBody: body(schemas.siteContentInput), responses: { 201: ok('Section'), ...errors(400, 401, 403, 409) } },
    },
    '/admin/site-content/{id}': {
      put: { tags: ['Website content'], summary: 'Update a section', security: secured, parameters: [pathParam('id', 'Section id')], requestBody: body(schemas.siteContentInput), responses: { 200: ok('Section'), ...errors(400, 401, 403, 404, 409) } },
      delete: { tags: ['Website content'], summary: 'Delete a section', security: secured, parameters: [pathParam('id', 'Section id')], responses: { 204: { description: 'Deleted' }, ...errors(401, 403, 404) } },
    },
    '/admin/site-content/image-uploads': { post: { tags: ['Website content'], summary: 'Get a one-time token to upload an image', description: 'Upload with supabase.storage.from("website-media").uploadToSignedUrl(path, token, file), then save `publicUrl` as the section image.', security: secured, requestBody: body(schemas.imageUpload), responses: { 201: ok('Upload slot', { type: 'object', properties: { path: { type: 'string' }, token: { type: 'string' }, publicUrl: { type: 'string' } } }), ...errors(400, 401, 403) } } },
    '/work-orders': {
      get: { tags: ['Work orders'], summary: 'Work orders visible to the caller', description: 'Super admins see all; employees see only their assigned orders.', security: secured, responses: { 200: ok('Work orders', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } },
      post: { tags: ['Work orders'], summary: 'Create a work order (super admin)', security: secured, requestBody: body(schemas.workOrderInput), responses: { 201: ok('Work order'), ...errors(400, 401, 403, 409) } },
    },
    '/work-orders/employees': { get: { tags: ['Work orders'], summary: 'Active employees who can be assigned (super admin)', security: secured, responses: { 200: ok('Employees', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } } },
    '/work-orders/{id}': { put: { tags: ['Work orders'], summary: 'Update a work order (super admin)', security: secured, parameters: [pathParam('id', 'Work order id')], requestBody: body(schemas.workOrderInput), responses: { 200: ok('Work order'), ...errors(400, 401, 403, 404) } } },
    '/work-orders/{id}/progress': { post: { tags: ['Work orders'], summary: 'Employee progress update', description: 'Change status (not Completed) and add notes or history entries. Existing entries cannot be changed.', security: secured, parameters: [pathParam('id', 'Work order id')], requestBody: body(schemas.workOrderProgress), responses: { 200: ok('Work order'), ...errors(400, 401, 403, 404) } } },
    '/admin/me': { get: { tags: ['Back office'], summary: 'The signed-in staff member', security: secured, responses: { 200: ok('Profile'), ...errors(401, 403) } } },
    '/admin/stats': { get: { tags: ['Back office'], summary: 'Dashboard statistics', security: secured, responses: { 200: ok('Statistics'), ...errors(401, 403) } } },
    '/admin/recent-activity': { get: { tags: ['Back office'], summary: 'Latest website submissions', security: secured, parameters: [queryParam('limit', 'Max rows', { type: 'integer', default: 8, maximum: 50 })], responses: { 200: ok('Submissions', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } } },
    '/admin/files/signed-url': { get: { tags: ['Back office'], summary: 'Short-lived link to an attachment or resume', security: secured, parameters: [queryParam('path', 'Storage path from the record', { type: 'string' }, true)], responses: { 200: ok('Signed URL', { type: 'object', properties: { url: { type: 'string' }, expiresIn: { type: 'integer' } } }), ...errors(400, 401, 403, 404) } } },
    '/admin/customers/{email}/activity': { get: { tags: ['Back office'], summary: 'All messages, bookings, applications, and payments for one customer', security: secured, parameters: [pathParam('email', 'Customer email')], responses: { 200: ok('Activity'), ...errors(401, 403) } } },
    '/admin/{resource}': { get: { tags: ['Back office'], summary: 'List records with search, filters, and pages', security: secured, parameters: [resourceParam, ...listParams], responses: { 200: ok('Page of records', { $ref: '#/components/schemas/Page' }), ...errors(400, 401, 403, 404) } } },
    '/admin/{resource}/{id}': {
      get: { tags: ['Back office'], summary: 'Get one record', security: secured, parameters: [resourceParam, pathParam('id', 'Record id (email for customers)')], responses: { 200: ok('Record'), ...errors(401, 403, 404) } },
      patch: { tags: ['Back office'], summary: 'Update status or internal notes', security: secured, parameters: [resourceParam, pathParam('id', 'Record id')], requestBody: body(schemas.recordUpdate), responses: { 200: ok('Updated record'), ...errors(400, 401, 403, 404, 409) } },
      delete: { tags: ['Back office'], summary: 'Delete a record (super admin only)', security: secured, parameters: [resourceParam, pathParam('id', 'Record id')], responses: { 204: { description: 'Deleted' }, ...errors(401, 403, 404, 405) } },
    },
    '/admin/payments': { post: { tags: ['Back office'], summary: 'Record a manual payment', security: secured, requestBody: body(schemas.paymentInput), responses: { 201: ok('Payment'), ...errors(400, 401, 403) } } },
    '/admin/payments/{id}': { put: { tags: ['Back office'], summary: 'Edit a manual payment', description: 'Stripe payments cannot be edited; they are updated by Stripe webhooks.', security: secured, parameters: [pathParam('id', 'Payment id')], requestBody: body(schemas.paymentInput), responses: { 200: ok('Payment'), ...errors(400, 401, 403, 404) } } },
    '/admin/shipments': {
      get: { tags: ['Shipments'], summary: 'List shipments', security: secured, responses: { 200: ok('Shipments', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } },
      post: { tags: ['Shipments'], summary: 'Create a shipment', security: secured, requestBody: body(schemas.shipmentInput), responses: { 201: ok('Shipment'), ...errors(400, 401, 403, 409) } },
    },
    '/admin/shipments/{reference}': {
      put: { tags: ['Shipments'], summary: 'Update a shipment', security: secured, parameters: [pathParam('reference', 'Tracking reference')], requestBody: body(schemas.shipmentInput), responses: { 200: ok('Shipment'), ...errors(400, 401, 403, 404) } },
      delete: { tags: ['Shipments'], summary: 'Delete a shipment (super admin only)', security: secured, parameters: [pathParam('reference', 'Tracking reference')], responses: { 204: { description: 'Deleted' }, ...errors(401, 403, 404) } },
    },
    '/admin/users': {
      get: { tags: ['Users'], summary: 'List staff accounts', security: secured, responses: { 200: ok('Users', { type: 'array', items: { type: 'object' } }), ...errors(401, 403) } },
      post: { tags: ['Users'], summary: 'Create an employee or admin account', security: secured, requestBody: body(schemas.userCreate), responses: { 201: ok('Created'), ...errors(400, 401, 403) } },
    },
    '/admin/users/{id}': {
      patch: { tags: ['Users'], summary: 'Update, suspend, or change the role of an account', description: 'Super-admin accounts cannot be changed here.', security: secured, parameters: [pathParam('id', 'User id')], requestBody: body(schemas.userUpdate), responses: { 200: ok('Updated'), ...errors(400, 401, 403, 404) } },
      delete: { tags: ['Users'], summary: 'Delete an account', security: secured, parameters: [pathParam('id', 'User id')], responses: { 204: { description: 'Deleted' }, ...errors(401, 403, 404, 409) } },
    },
  },
}

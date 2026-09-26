import { Typography } from '@mui/material'
import { StatusChip, type Option, type RecordsConfig } from '../../features/backoffice/RecordsPage'
import { formatDate, formatDateTime, formatMoney, type RecordRow } from '../../services/backoffice'

export const contactStatuses: Option[] = [
  { value: 'new', label: 'New', color: 'info' },
  { value: 'in_progress', label: 'In progress', color: 'primary' },
  { value: 'resolved', label: 'Resolved', color: 'success' },
  { value: 'archived', label: 'Archived' },
]

export const bookingStatuses: Option[] = [
  { value: 'pending', label: 'Pending', color: 'info' },
  { value: 'confirmed', label: 'Confirmed', color: 'primary' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show', color: 'warning' },
]

export const bookingPaymentStatuses: Option[] = [
  { value: 'unpaid', label: 'Unpaid', color: 'warning' },
  { value: 'paid', label: 'Paid', color: 'success' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'waived', label: 'Waived' },
]

export const applicationStatuses: Option[] = [
  { value: 'new', label: 'New', color: 'info' },
  { value: 'reviewing', label: 'Reviewing', color: 'primary' },
  { value: 'interview', label: 'Interview', color: 'secondary' },
  { value: 'offer', label: 'Offer', color: 'success' },
  { value: 'hired', label: 'Hired', color: 'success' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export const paymentStatuses: Option[] = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'paid', label: 'Paid', color: 'success' },
  { value: 'failed', label: 'Failed', color: 'error' },
  { value: 'refunded', label: 'Refunded' },
]

export const paymentMethods: Option[] = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'intuit', label: 'Intuit payment link' },
  { value: 'other', label: 'Other' },
]

const text = (key: string) => (row: RecordRow) => <Typography variant="body2">{String(row[key] ?? '') || '—'}</Typography>
const strong = (key: string) => (row: RecordRow) => <Typography variant="body2" fontWeight={800}>{String(row[key] ?? '—')}</Typography>
const created = { key: 'created_at', label: 'Received', render: (row: RecordRow) => formatDateTime(row.created_at), hideOnMobile: true }
const updated = { key: 'updated_at', label: 'Last updated', render: (row: RecordRow) => formatDateTime(row.updated_at) }
const email = { key: 'email', label: 'Email', render: (row: RecordRow) => <a href={`mailto:${String(row.email)}`}>{String(row.email)}</a> }
const phone = { key: 'phone', label: 'Phone', render: (row: RecordRow) => row.phone ? <a href={`tel:${String(row.phone)}`}>{String(row.phone)}</a> : '—' }

export const contactsConfig: RecordsConfig = {
  table: 'contact_submissions',
  title: 'Contact messages',
  subtitle: 'Messages sent through the Contact Us form.',
  canonical: '/admin/contacts/',
  titleKey: 'subject',
  searchColumns: ['reference', 'full_name', 'email', 'subject', 'company', 'phone'],
  searchPlaceholder: 'Search name, email, subject, reference',
  columns: [
    { key: 'reference', label: 'Reference', render: strong('reference') },
    { key: 'full_name', label: 'Name' },
    { key: 'subject', label: 'Subject' },
    { key: 'service', label: 'Service', hideOnMobile: true },
    { key: 'status', label: 'Status', render: row => <StatusChip value={row.status} options={contactStatuses} /> },
    created,
  ],
  details: [
    { key: 'reference', label: 'Reference' },
    { key: 'full_name', label: 'Name' },
    email,
    phone,
    { key: 'company', label: 'Company' },
    { key: 'preferred_method', label: 'Preferred contact method' },
    { key: 'service', label: 'Service interested in' },
    { key: 'subject', label: 'Subject' },
    { key: 'message', label: 'Message', render: text('message') },
    { key: 'created_at', label: 'Received', render: row => formatDateTime(row.created_at) },
    updated,
  ],
  filters: [{ key: 'status', label: 'Status', options: contactStatuses, editable: true }],
  notes: true,
  file: { pathKey: 'attachment_path', nameKey: 'attachment_name', label: 'Attachment' },
  deletable: true,
  csvName: 'iman-contact-messages',
}

export const bookingsConfig: RecordsConfig = {
  table: 'consultation_bookings',
  title: 'Consultation bookings',
  subtitle: 'Registrations from the Consultation booking flow.',
  canonical: '/admin/bookings/',
  titleKey: 'reference',
  searchColumns: ['reference', 'full_name', 'email', 'service_name', 'company', 'phone'],
  searchPlaceholder: 'Search name, email, service, reference',
  orderBy: { column: 'booking_date', ascending: false },
  columns: [
    { key: 'reference', label: 'Reference', render: strong('reference') },
    { key: 'full_name', label: 'Client' },
    { key: 'service_name', label: 'Service', hideOnMobile: true },
    { key: 'booking_date', label: 'Date', render: row => `${formatDate(row.booking_date)} · ${String(row.booking_time)}` },
    { key: 'status', label: 'Status', render: row => <StatusChip value={row.status} options={bookingStatuses} /> },
    { key: 'payment_status', label: 'Payment', render: row => <StatusChip value={row.payment_status} options={bookingPaymentStatuses} /> },
  ],
  details: [
    { key: 'reference', label: 'Reference' },
    { key: 'service_name', label: 'Service' },
    { key: 'booking_date', label: 'Date', render: row => formatDate(row.booking_date) },
    { key: 'booking_time', label: 'Time' },
    { key: 'time_zone', label: 'Client time zone' },
    { key: 'duration_minutes', label: 'Duration (minutes)' },
    { key: 'price_cents', label: 'Price', render: row => formatMoney(Number(row.price_cents)) },
    { key: 'meeting_type', label: 'Meeting type' },
    { key: 'full_name', label: 'Client' },
    email,
    phone,
    { key: 'company', label: 'Company' },
    { key: 'message', label: 'Message', render: text('message') },
    { key: 'created_at', label: 'Booked', render: row => formatDateTime(row.created_at) },
    updated,
  ],
  filters: [
    { key: 'status', label: 'Status', options: bookingStatuses, editable: true },
    { key: 'payment_status', label: 'Payment', options: bookingPaymentStatuses, editable: true },
  ],
  notes: true,
  deletable: true,
  csvName: 'iman-consultation-bookings',
}

export const applicationsConfig: RecordsConfig = {
  table: 'job_applications',
  title: 'Job applications',
  subtitle: 'Applications sent from the Careers page.',
  canonical: '/admin/applications/',
  titleKey: 'full_name',
  searchColumns: ['reference', 'full_name', 'email', 'position', 'location', 'phone'],
  searchPlaceholder: 'Search name, email, position, reference',
  columns: [
    { key: 'reference', label: 'Reference', render: strong('reference') },
    { key: 'full_name', label: 'Applicant' },
    { key: 'position', label: 'Position' },
    { key: 'location', label: 'Location', hideOnMobile: true },
    { key: 'status', label: 'Status', render: row => <StatusChip value={row.status} options={applicationStatuses} /> },
    created,
  ],
  details: [
    { key: 'reference', label: 'Reference' },
    { key: 'position', label: 'Position' },
    { key: 'full_name', label: 'Applicant' },
    email,
    phone,
    { key: 'location', label: 'Location' },
    { key: 'experience', label: 'Experience' },
    { key: 'cover_letter', label: 'About the applicant', render: text('cover_letter') },
    { key: 'created_at', label: 'Received', render: row => formatDateTime(row.created_at) },
    updated,
  ],
  filters: [{ key: 'status', label: 'Status', options: applicationStatuses, editable: true }],
  notes: true,
  file: { pathKey: 'resume_path', nameKey: 'resume_name', label: 'Resume' },
  deletable: true,
  csvName: 'iman-job-applications',
}

export const paymentsBaseConfig: RecordsConfig = {
  table: 'payments',
  title: 'Payments',
  subtitle: 'Payments recorded by staff. Linking a payment to a booking updates that booking’s payment status.',
  canonical: '/admin/payments/',
  titleKey: 'reference',
  searchColumns: ['reference', 'payer_name', 'payer_email', 'description', 'provider_reference'],
  searchPlaceholder: 'Search payer, email, description, reference',
  columns: [
    { key: 'reference', label: 'Reference', render: strong('reference') },
    { key: 'payer_name', label: 'Payer' },
    { key: 'description', label: 'Description', hideOnMobile: true },
    { key: 'amount_cents', label: 'Amount', render: row => formatMoney(Number(row.amount_cents), String(row.currency)) },
    { key: 'method', label: 'Method', render: row => paymentMethods.find(item => item.value === row.method)?.label ?? String(row.method), hideOnMobile: true },
    { key: 'status', label: 'Status', render: row => <StatusChip value={row.status} options={paymentStatuses} /> },
    created,
  ],
  details: [
    { key: 'reference', label: 'Reference' },
    { key: 'payer_name', label: 'Payer' },
    { key: 'payer_email', label: 'Payer email' },
    { key: 'description', label: 'Description' },
    { key: 'amount_cents', label: 'Amount', render: row => formatMoney(Number(row.amount_cents), String(row.currency)) },
    { key: 'method', label: 'Method' },
    { key: 'provider_reference', label: 'Receipt / transaction number' },
    { key: 'paid_at', label: 'Paid at', render: row => formatDateTime(row.paid_at) },
    { key: 'created_at', label: 'Recorded', render: row => formatDateTime(row.created_at) },
    updated,
  ],
  filters: [
    { key: 'status', label: 'Status', options: paymentStatuses, editable: true },
    { key: 'method', label: 'Method', options: paymentMethods },
  ],
  notes: true,
  deletable: true,
  csvName: 'iman-payments',
}

export const auditEntities: Option[] = ['contact_submissions', 'consultation_bookings', 'job_applications', 'payments', 'shipments', 'work_orders', 'site_content', 'profiles']
  .map(value => ({ value, label: value.replaceAll('_', ' ') }))

export const auditConfig: RecordsConfig = {
  table: 'audit_logs',
  title: 'Audit log',
  subtitle: 'Every create, update, and delete across back-office data, with who made it.',
  canonical: '/admin/audit/',
  titleKey: 'action',
  orderBy: { column: 'occurred_at', ascending: false },
  searchColumns: ['action', 'entity_id', 'actor_email', 'actor_role'],
  searchPlaceholder: 'Search action, record ID, actor email',
  columns: [
    { key: 'occurred_at', label: 'When', render: row => formatDateTime(row.occurred_at) },
    { key: 'actor_email', label: 'Actor', render: row => String(row.actor_email || row.actor_role || '—') },
    { key: 'action', label: 'Action', render: strong('action') },
    { key: 'entity_type', label: 'Record type' },
    { key: 'entity_id', label: 'Record ID', hideOnMobile: true },
  ],
  details: [
    { key: 'occurred_at', label: 'When', render: row => formatDateTime(row.occurred_at) },
    { key: 'actor_email', label: 'Actor email' },
    { key: 'actor_role', label: 'Actor role' },
    { key: 'entity_type', label: 'Record type' },
    { key: 'entity_id', label: 'Record ID' },
    { key: 'changes', label: 'Changes', render: row => <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: 'action.hover', p: 1.5, borderRadius: 2, overflowX: 'auto' }}>{JSON.stringify(row.changes, null, 2)}</Typography> },
    { key: 'metadata', label: 'Details', render: row => <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{JSON.stringify(row.metadata, null, 2)}</Typography> },
  ],
  filters: [{ key: 'entity_type', label: 'Record type', options: auditEntities }],
  csvName: 'iman-audit-log',
}

export const customersConfig: RecordsConfig = {
  table: 'customers',
  title: 'Customers',
  subtitle: 'Everyone who has contacted, booked, applied, or paid, grouped by email address.',
  canonical: '/admin/customers/',
  idKey: 'email',
  titleKey: 'full_name',
  orderBy: { column: 'last_seen_at', ascending: false },
  searchColumns: ['email', 'full_name', 'phone'],
  searchPlaceholder: 'Search name, email, phone',
  columns: [
    { key: 'full_name', label: 'Name', render: strong('full_name') },
    { key: 'email', label: 'Email' },
    { key: 'contact_count', label: 'Messages', hideOnMobile: true },
    { key: 'booking_count', label: 'Bookings', hideOnMobile: true },
    { key: 'application_count', label: 'Applications', hideOnMobile: true },
    { key: 'total_paid_cents', label: 'Paid', render: row => formatMoney(Number(row.total_paid_cents)) },
    { key: 'last_seen_at', label: 'Last activity', render: row => formatDateTime(row.last_seen_at) },
  ],
  details: [
    { key: 'full_name', label: 'Name' },
    email,
    phone,
    { key: 'first_seen_at', label: 'First seen', render: row => formatDateTime(row.first_seen_at) },
    { key: 'last_seen_at', label: 'Last activity', render: row => formatDateTime(row.last_seen_at) },
  ],
  csvName: 'iman-customers',
}

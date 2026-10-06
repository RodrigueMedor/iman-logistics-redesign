# Back office setup

Architecture: **React site → Iman Logistics API (Node.js/Express, `server/`) →
Supabase (Postgres, Auth, Storage)**. Every form, the back office (`/admin/`),
work orders, and the website content editor go through the API. Staff sign in
with Supabase Auth; the API checks each request's token and role, and runs
staff queries as that user so the database's row-level security still applies.

API documentation (Swagger UI): `http://localhost:3001/api/docs`
(OpenAPI JSON at `/api/openapi.json`). Both are off in production
(`NODE_ENV=production`) unless `SWAGGER_ENABLED=true`.

## Production

1. Create a Supabase project **for this website**. The Iman Trucking School
   project defines its own `profiles`, `is_super_admin()`, and sign-up trigger,
   so the two sites must not share a database without adapting the migrations.
2. Apply every file in `supabase/migrations/` in filename order, either with
   `npx supabase link --project-ref <ref> && npx supabase db push`, or by
   pasting each file into the SQL Editor.
3. In Supabase Authentication → Users → Add user, create `info@imanlogistics.com`
   with a password and tick "Auto Confirm User". It becomes super admin as soon
   as it is created (migration `202610060002_super_admin_auto_promote.sql`); an
   account that already existed is promoted by `202610060001_super_admin_email.sql`.

   Only `info@imanlogistics.com` can be super admin. The database refuses the
   role for any other account, and the API rejects any other `super_admin`
   profile with "Unauthorized Super Admin account." Password-recovery emails are
   sent by Supabase Auth: without custom SMTP (Authentication → Emails → SMTP
   Settings) they only reach members of the Supabase organization.

4. In Supabase Authentication → URL configuration, set the site URL to the
   production domain and add `https://<domain>/admin/reset-password/` as a
   redirect URL.
5. Deploy to Hostinger (Node.js 22). One process serves the website and the
   API: `npm ci && npm run build && npm start` (entry file `server.js`; with
   pm2: `pm2 startOrReload ecosystem.config.cjs --update-env`). Set the
   variables from `.env.example` in hPanel, or in a `.env` file next to
   `server.js` (loaded automatically, never committed). Set `APP_URL` and
   `CORS_ORIGINS` to the public `https://` address. The browser gets
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at runtime from
   `/runtime-config.js`, so they are needed on the server, not at build time.
   Secrets must never have a `VITE_` prefix and must never be committed.
6. Check `https://<domain>/api/health` reports `database: true`.
7. Stripe: in the Stripe Dashboard → Developers → Webhooks, add
   `https://<domain>/api/stripe/webhook` for `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `payment_intent.succeeded`,
   `payment_intent.payment_failed`, and `charge.refunded`; put its signing
   secret in `STRIPE_WEBHOOK_SECRET`. Confirm the payment policy wording in
   `src/features/consultation/serviceCatalog.ts` first.
8. Email and SMS: set `RESEND_API_KEY` (with a verified sender domain for
   `FREIGHT_BROKER_EMAIL_FROM`), `FREIGHT_BROKER_NOTIFY_EMAIL`, and optionally
   the three `TWILIO_*` values. Every attempt appears under Notifications.
9. Sign in at `/admin/login/`.

## Freight Broker Masterclass registration

Matches the live Dispatcher Class Registration at
imantruckingschool.com/dispatcher-registration/ (school repo `origin/main`).
Flow on `/freight-broker-masterclass/#register`: **Your information** (pick
from **Upcoming sessions**; creates a `SUBMITTED` registration `FBM-2026-…`)
→ **Review & policy** (typed signature, then Stripe Checkout at the session's
price) → **Confirmation**. The Stripe webhook marks the payment paid, a
database trigger sets the registration `CONFIRMED`, and the API sends the
"Payment Confirmed" email and SMS to the registrant plus the "New payment
received" email (and SMS, if `FREIGHT_BROKER_NOTIFY_PHONE` is set) to staff.

Only sessions with status `OPEN` that have not ended are listed. Checkout is
refused when a session is not `OPEN`, is past its registration deadline, or
has no seats left.

- Class sessions (dates, price, location, seats): `/admin/freight-broker/classes/`
- Registrations, signed policies, and notifications sent: `/admin/freight-broker/`
- All emails and SMS: `/admin/notifications/`
- Policy wording (confirm before going live): `src/features/freightBroker/program.ts`

## Roles

| Role | Access |
|---|---|
| `super_admin` | Everything: back office, work orders, users and roles, audit log, website content, deletes |
| `admin` | Back office: messages, bookings, applications, payments, customers, shipments (view, update status and notes; no deletes) |
| `employee` | Employee portal: only the work orders assigned to them |

Super admins create `admin` and `employee` accounts at `/admin/users/`.

## Local development

```bash
npx supabase start          # local Postgres, Auth, Storage (Docker)
npx supabase db reset       # apply migrations + supabase/seed.sql
npm run dev:api             # API on http://localhost:3001 (Swagger at /api/docs)
npm run dev                 # website on http://localhost:5173 (proxies /api)
# optional, for Stripe, email, and SMS without real accounts:
docker run -d -p 12111:12111 stripe/stripe-mock
node scripts/mock-notifications.mjs   # captures Resend/Twilio requests on :4010
```

Put the local URL and keys printed by `npx supabase status` in
`.env.development.local` (gitignored). Then run the end-to-end checks:

```bash
node --env-file=.env.development.local scripts/test-backoffice.mjs
```

The script refuses to run unless `SUPABASE_URL` points at a local stack.

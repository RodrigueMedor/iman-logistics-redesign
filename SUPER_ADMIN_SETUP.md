# Back office setup

Architecture: **React site → Iman Logistics API (Node.js/Express, `server/`) →
Supabase (Postgres, Auth, Storage)**. Every form, the back office (`/admin/`),
work orders, and the website content editor go through the API. Staff sign in
with Supabase Auth; the API checks each request's token and role, and runs
staff queries as that user so the database's row-level security still applies.

API documentation (Swagger UI): `http://localhost:3001/api/docs`
(OpenAPI JSON at `/api/openapi.json`).

## Production

1. Create a Supabase project **for this website**. The Iman Trucking School
   project defines its own `profiles`, `is_super_admin()`, and sign-up trigger,
   so the two sites must not share a database without adapting the migrations.
2. Apply every file in `supabase/migrations/` in filename order, either with
   `npx supabase link --project-ref <ref> && npx supabase db push`, or by
   pasting each file into the SQL Editor.
3. In Supabase Authentication, create the first user with an email and password,
   then promote only that account:

   ```sql
   update public.profiles
   set role = 'super_admin'
   where id = (select id from auth.users where email = 'your-admin@email.com');
   ```

4. In Supabase Authentication → URL configuration, set the site URL to the
   production domain and add `https://<domain>/admin/reset-password/` as a
   redirect URL.
5. Deploy the API (any Node.js 22 host, or `docker build -f Dockerfile.api .`):
   `npm ci && npm run build:api && npm run start:api`, with the server
   variables from `.env.example`. Secrets must never have a `VITE_` prefix and
   must never be committed.
6. Deploy the website (e.g. Netlify) with `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. Either proxy `/api/*` to the API (see the
   commented redirect in `netlify.toml`) or set `VITE_API_BASE_URL`.
7. Stripe: in the Stripe Dashboard → Developers → Webhooks, add
   `https://<api-host>/api/stripe/webhook` for `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `payment_intent.succeeded`,
   `payment_intent.payment_failed`, and `charge.refunded`; put its signing
   secret in `STRIPE_WEBHOOK_SECRET`. Confirm the payment policy wording in
   `src/features/consultation/serviceCatalog.ts` first.
8. Sign in at `/admin/login/`.

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
# optional, for Stripe without real keys:
docker run -d -p 12111:12111 stripe/stripe-mock
```

Put the local URL and keys printed by `npx supabase status` in
`.env.development.local` (gitignored). Then run the end-to-end checks:

```bash
node --env-file=.env.development.local scripts/test-backoffice.mjs
```

The script refuses to run unless `SUPABASE_URL` points at a local stack.

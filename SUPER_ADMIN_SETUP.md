# Back office setup

The website forms, back office (`/admin/`), employee work orders, and website
content editor all use Supabase. Public forms post to Netlify Functions, which
validate input and write to Supabase with the server-side secret key.

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
5. In Netlify → Site configuration → Environment variables, add
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
   `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`). The secret key must
   never have a `VITE_` prefix and must never be committed.
6. Deploy, then sign in at `/admin/login/`.

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
netlify dev --port 8888     # site + Netlify Functions
```

Put the local URL and keys printed by `npx supabase status` in
`.env.development.local` (gitignored). Then run the end-to-end checks:

```bash
node --env-file=.env.development.local scripts/test-backoffice.mjs
```

The script refuses to run unless `SUPABASE_URL` points at a local stack.

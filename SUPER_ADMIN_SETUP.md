# Secure dashboard setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/migrations/202607240001_secure_work_orders.sql`.
3. In Supabase Authentication, create the first user with an email and password.
4. In SQL Editor, promote only that account:

```sql
update public.profiles
set role = 'super_admin'
where id = (
  select id from auth.users where email = 'your-admin@email.com'
);
```

5. Copy `.env.example` to `.env.local` and fill in the browser-safe Supabase URL and publishable key.
6. In Netlify environment variables, add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
7. Deploy, then sign in at `/admin/login/`.

The secret key belongs only in Netlify. Never put it in a `VITE_` variable or commit it.

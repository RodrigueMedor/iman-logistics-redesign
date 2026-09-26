# Iman Logistics Redesign

React 19 and Material UI migration of the Iman Logistics website.

## Local development

```bash
npm install
npm run dev
```

## Back office and database

Website forms (Contact, Consultation booking, Careers applications) are saved
to Supabase through Netlify Functions in `netlify/functions/`, and managed at
`/admin/`. See `SUPER_ADMIN_SETUP.md` for database, role, and local setup.

## Production build

```bash
npm run build
```

The production output is generated in `dist/`.

## Netlify deployment

This repository includes `netlify.toml` with the required build command, publish directory, Node version, and React Router SPA fallback.

In Netlify:

1. Import this GitHub repository.
2. Keep the detected settings from `netlify.toml`.
3. Select **Deploy**.


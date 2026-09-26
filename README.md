# Iman Logistics Redesign

React 19 and Material UI migration of the Iman Logistics website.

## Local development

```bash
npm install
npm run dev
```

## Back office and database

The API is a Node.js/Express server in `server/` with Swagger UI at
`/api/docs`. Website forms (Contact, Consultation booking with Stripe Checkout,
Careers applications) go through it to Supabase and are managed at `/admin/`.

```bash
npm run dev:api   # API  → http://localhost:3001/api/docs
npm run dev       # site → http://localhost:5173
```

See `SUPER_ADMIN_SETUP.md` for database, roles, deployment, and Stripe setup.

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


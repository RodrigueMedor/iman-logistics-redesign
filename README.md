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

## Production build and hosting (Hostinger)

```bash
npm run build     # website → dist/, API → server/dist/
npm start         # one Node.js process serves the website and the API
```

In production a single Node.js process (`server.js`) serves the built website,
the API, and Swagger UI, and gives the browser its Supabase settings at
runtime through `/runtime-config.js`. On Hostinger, run it as a Node.js app
(entry file `server.js`) or with pm2 (`pm2 startOrReload ecosystem.config.cjs`).
See `SUPER_ADMIN_SETUP.md` for the environment variables and setup steps.

GitHub Actions (`.github/workflows/hostinger-deploy.yml`) builds the site on
every push and pull request to `main`.


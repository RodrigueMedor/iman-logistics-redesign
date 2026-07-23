# Iman Logistics Redesign

React 19 and Material UI migration of the Iman Logistics website.

## Local development

```bash
npm install
npm run dev
```

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


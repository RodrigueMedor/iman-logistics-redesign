import fs from 'node:fs'

// Load a .env file next to the app if present (Hostinger: put production
// settings there, or set them in hPanel). Existing environment variables win.
if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env')

const { createApp } = await import('./app')
const { config, databaseConfigured } = await import('./config')

createApp().listen(config.port, () => {
  console.log(`Iman Logistics listening on http://localhost:${config.port}`)
  if (config.swaggerEnabled) console.log(`Swagger UI: http://localhost:${config.port}/api/docs`)
  console.log(`Database configured: ${databaseConfigured()} · Stripe configured: ${Boolean(config.stripeSecretKey)} · Serving website: ${config.serveWebsite}`)
})

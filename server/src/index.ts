import { createApp } from './app'
import { config, databaseConfigured } from './config'

createApp().listen(config.port, () => {
  console.log(`Iman Logistics API listening on http://localhost:${config.port}`)
  if (config.swaggerEnabled) console.log(`Swagger UI: http://localhost:${config.port}/api/docs`)
  console.log(`Database configured: ${databaseConfigured()} · Stripe configured: ${Boolean(config.stripeSecretKey)}`)
})

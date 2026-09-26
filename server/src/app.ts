import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { config, databaseConfigured } from './config'
import { errorHandler, notFound } from './lib/http'
import { openApiDocument } from './openapi'
import { adminRoutes } from './routes/admin'
import { publicRoutes } from './routes/public'
import { siteContentAdminRoutes, siteContentRoutes } from './routes/siteContent'
import { stripeWebhookRoutes } from './routes/stripeWebhook'
import { workOrderRoutes } from './routes/workOrders'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Behind a hosting proxy, use the real client IP for rate limiting.
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: config.corsOrigins, allowedHeaders: ['Content-Type', 'Authorization'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }))

  // The Stripe webhook needs the raw body, so it is mounted before express.json().
  app.use('/api', stripeWebhookRoutes)
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: databaseConfigured(), stripe: Boolean(config.stripeSecretKey), stripeWebhook: Boolean(config.stripeWebhookSecret) })
  })

  if (config.swaggerEnabled) {
    app.get('/api/openapi.json', (_req, res) => { res.json(openApiDocument) })
    // Swagger UI needs inline scripts and styles, so it gets its own policy.
    app.use('/api/docs', helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:', 'https:'] } } }), swaggerUi.serve, swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Iman Logistics API',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    }))
  }

  app.use('/api', publicRoutes)
  app.use('/api', siteContentRoutes)
  app.use('/api/work-orders', workOrderRoutes)
  // Before adminRoutes, whose generic /:resource route would otherwise match.
  app.use('/api/admin/site-content', siteContentAdminRoutes)
  app.use('/api/admin', adminRoutes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

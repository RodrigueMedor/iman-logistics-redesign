import express from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { config, databaseConfigured } from './config'
import { errorHandler, notFound } from './lib/http'
import { openApiDocument } from './openapi'
import { defaultDistDir, runtimeConfigScript, serveWebsite } from './static'
import { adminRoutes } from './routes/admin'
import { freightBrokerAdminRoutes, freightBrokerRoutes } from './routes/freightBroker'
import { publicRoutes } from './routes/public'
import { siteContentAdminRoutes, siteContentRoutes } from './routes/siteContent'
import { stripeWebhookRoutes } from './routes/stripeWebhook'
import { workOrderRoutes } from './routes/workOrders'

export function createApp(options: { distDir?: string } = {}) {
  const app = express()
  app.disable('x-powered-by')
  // Behind a hosting proxy, use the real client IP for rate limiting.
  app.set('trust proxy', 1)
  // Security headers. The policy allows the site's own files plus the
  // Supabase project (sign-in, storage uploads, and public images).
  const supabaseOrigin = config.supabaseUrl ? new URL(config.supabaseUrl).origin : ''
  const https = config.appUrl.startsWith('https://')
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', ...(supabaseOrigin ? [supabaseOrigin] : [])],
        'font-src': ["'self'", 'data:'],
        'media-src': ["'self'", 'blob:'],
        'connect-src': ["'self'", ...(supabaseOrigin ? [supabaseOrigin] : [])],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        ...(https ? { 'upgrade-insecure-requests': [] } : {}),
      },
    },
    strictTransportSecurity: https,
  }))
  app.use(compression())
  app.use(cors({ origin: config.corsOrigins, allowedHeaders: ['Content-Type', 'Authorization'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }))

  // The Stripe webhook needs the raw body, so it is mounted before express.json().
  app.use('/api', stripeWebhookRoutes)
  app.use(express.json({ limit: '100kb' }))

  app.get('/runtime-config.js', (_req, res) => {
    res.type('application/javascript').set('Cache-Control', 'no-store').send(runtimeConfigScript())
  })

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
  app.use('/api/freight-broker', freightBrokerRoutes)
  // Before adminRoutes, whose generic /:resource route would otherwise match.
  app.use('/api/admin/site-content', siteContentAdminRoutes)
  app.use('/api/admin/freight-broker', freightBrokerAdminRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api', notFound)
  if (config.serveWebsite) serveWebsite(app, options.distDir ?? defaultDistDir())
  app.use(notFound)
  app.use(errorHandler)
  return app
}

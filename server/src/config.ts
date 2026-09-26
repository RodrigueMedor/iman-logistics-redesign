// Environment for the API server. Accepts the same variable names as the Iman
// Trucking School server (VITE_* plus SUPABASE_SERVICE_ROLE_KEY) so one set of
// values can serve both. Secrets are server-only: never prefix them with VITE_.
const list = (value?: string) => (value || '').split(',').map(item => item.trim()).filter(Boolean)

export const config = {
  port: Number(process.env.PORT || 3001),
  isProduction: process.env.NODE_ENV === 'production',
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  // Public site origin, used for Stripe return URLs and password-reset links.
  appUrl: process.env.APP_URL || process.env.PUBLIC_SITE_URL || 'http://localhost:5173',
  // Browser origins allowed to call the API.
  corsOrigins: list(process.env.CORS_ORIGINS).length ? list(process.env.CORS_ORIGINS) : ['http://localhost:5173', 'http://localhost:4173'],
  // Public form submissions allowed per IP address per 15 minutes.
  submissionRateLimit: Number(process.env.RATE_LIMIT_SUBMISSIONS || 20),
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  // Email via Resend and SMS via Twilio; each is skipped until configured.
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Iman Logistics <info@imanlogistics.com>',
  freightBrokerEmailFrom: process.env.FREIGHT_BROKER_EMAIL_FROM || process.env.EMAIL_FROM || 'Iman Logistics <info@imanlogistics.com>',
  // Department inbox told about every paid Freight Broker Masterclass registration.
  freightBrokerNotifyEmail: process.env.FREIGHT_BROKER_NOTIFY_EMAIL || 'info@imanlogistics.com',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    // Only for local testing against a mock server.
    apiBaseUrl: (process.env.TWILIO_API_BASE_URL || 'https://api.twilio.com').replace(/\/+$/, ''),
  },
  // Only for local testing against stripe-mock.
  stripeApi: process.env.STRIPE_API_HOST ? { host: process.env.STRIPE_API_HOST, port: Number(process.env.STRIPE_API_PORT || 443), protocol: (process.env.STRIPE_API_PROTOCOL || 'https') as 'http' | 'https' } : null,
}

export const databaseConfigured = () => Boolean(config.supabaseUrl && config.supabasePublishableKey && config.supabaseSecretKey)

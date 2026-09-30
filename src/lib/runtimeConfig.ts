// Settings the production server provides at runtime through
// /runtime-config.js (loaded before the app in index.html), so one build works
// on any host without baking environment values into the bundle. Falls back to
// Vite build-time values.
type RuntimeConfig = { supabaseUrl?: string; supabasePublishableKey?: string; apiBaseUrl?: string; registrationPhoneVerification?: boolean }

const runtime: RuntimeConfig = (typeof window !== 'undefined' && (window as unknown as { __IMAN_CONFIG__?: RuntimeConfig }).__IMAN_CONFIG__) || {}

export const runtimeConfig = {
  supabaseUrl: (runtime.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '').trim(),
  supabasePublishableKey: (runtime.supabasePublishableKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim(),
  apiBaseUrl: (runtime.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '').trim(),
  // Masterclass registration asks for an SMS code unless the server turns it off.
  registrationPhoneVerification: runtime.registrationPhoneVerification !== false,
}

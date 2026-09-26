import { createClient } from '@supabase/supabase-js'
import { runtimeConfig } from './runtimeConfig'

const url = runtimeConfig.supabaseUrl
const publishableKey = runtimeConfig.supabasePublishableKey

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

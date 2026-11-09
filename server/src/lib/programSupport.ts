import { HttpError } from './http'

// Until supabase/migrations/202611080001_freight_broker_master_class.sql has
// run, the database has no `program` column and no
// freight_broker_open_classes(p_program). Deploys don't run migrations, so the
// API keeps the Dispatch Masterclass working on the older database instead of
// failing every masterclass page, and the Broker Master Class simply has no
// sessions until the migration runs.
export function isMissingProgramSupport(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === 'PGRST202') return /freight_broker_open_classes/.test(error.message ?? '')
  return (error.code === '42703' || error.code === 'PGRST204') && /\bprogram\b/.test(error.message ?? '')
}

let warned = false
export function warnMissingProgramSupport() {
  if (warned) return
  warned = true
  console.warn('Database update 202611080001_freight_broker_master_class.sql has not been run: Broker Master Class sessions are unavailable until it is.')
}

export const programSupportRequired = () => new HttpError(503,
  'The Broker Master Class database update has not been run yet. Run supabase/migrations/202611080001_freight_broker_master_class.sql in the Supabase SQL editor, then try again.')

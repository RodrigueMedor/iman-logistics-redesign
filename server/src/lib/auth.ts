import type { NextFunction, Request, Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http'
import { userClient } from './supabase'

export type Role = 'super_admin' | 'admin' | 'employee'
export type Staff = { id: string; email: string; role: Role; fullName: string }

declare module 'express-serve-static-core' {
  interface Request {
    staff?: Staff
    db?: SupabaseClient
  }
}

export const backOffice: Role[] = ['super_admin', 'admin']
export const superAdminOnly: Role[] = ['super_admin']

// Requires a Supabase access token (Authorization: Bearer <token>) belonging
// to an active profile with one of the given roles.
export function requireRole(roles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new HttpError(401, 'Sign in is required.')
    const db = userClient(token)
    const { data: auth } = await db.auth.getUser(token)
    if (!auth.user) throw new HttpError(401, 'Invalid or expired session.')
    const { data: profile } = await db.from('profiles').select('id, email, full_name, role, active').eq('id', auth.user.id).maybeSingle()
    if (!profile?.active || !roles.includes(profile.role)) throw new HttpError(403, 'You do not have permission to do this.')
    req.staff = { id: profile.id, email: profile.email, role: profile.role, fullName: profile.full_name }
    req.db = db
    next()
  }
}

export const staff = (req: Request) => {
  if (!req.staff || !req.db) throw new HttpError(401, 'Sign in is required.')
  return { staff: req.staff, db: req.db }
}

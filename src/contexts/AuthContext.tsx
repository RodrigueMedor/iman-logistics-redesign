import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getDemoEmployees } from '../services/demoAuth'

export type AppRole = 'super_admin' | 'employee'
export type UserProfile = {
  id: string
  full_name: string
  role: AppRole
  active: boolean
}

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: UserProfile | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const demoEmail = 'superadmin@imanlogistics.com'
const demoUsername = 'superadmin'
const demoPassword = 'Admin123!'
const demoSessionKey = 'iman-local-super-admin-session'

function createDemoSession(email = demoEmail, id = 'local-super-admin', fullName = 'Iman Super Admin'): Session {
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: { full_name: fullName },
    created_at: new Date().toISOString(),
  } as User
  return {
    access_token: 'local-development-only',
    refresh_token: 'local-development-only',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId?: string) => {
    if (!supabase || !userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('id, full_name, role, active').eq('id', userId).maybeSingle()
    setProfile((data as UserProfile | null) ?? null)
  }

  useEffect(() => {
    if (!supabase) {
      if (import.meta.env.DEV) {
        const saved = window.localStorage.getItem(demoSessionKey) || window.sessionStorage.getItem(demoSessionKey)
        if (saved) {
          try {
            const account = JSON.parse(saved) as { id: string; email: string; fullName: string; role: AppRole }
            window.localStorage.setItem(demoSessionKey, saved)
            window.sessionStorage.removeItem(demoSessionKey)
            setSession(createDemoSession(account.email, account.id, account.fullName))
            setProfile({ id: account.id, full_name: account.fullName, role: account.role, active: true })
          } catch {
            window.localStorage.removeItem(demoSessionKey)
          }
        }
      }
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession?.user.id)
      setLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured || import.meta.env.DEV,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    signIn: async (email, password) => {
      if (!supabase && import.meta.env.DEV) {
        const normalizedLogin = email.trim().toLowerCase()
        const isAdmin = [demoEmail, demoUsername].includes(normalizedLogin) && password === demoPassword
        const employee = getDemoEmployees().find(account => account.email === normalizedLogin && account.password === password && account.active)
        if (!isAdmin && !employee) return 'Invalid temporary username or password.'
        const account = isAdmin
          ? { id: 'local-super-admin', email: demoEmail, fullName: 'Iman Super Admin', role: 'super_admin' as AppRole }
          : { id: employee!.id, email: employee!.email, fullName: employee!.fullName, role: 'employee' as AppRole }
        window.localStorage.setItem(demoSessionKey, JSON.stringify(account))
        setSession(createDemoSession(account.email, account.id, account.fullName))
        setProfile({ id: account.id, full_name: account.fullName, role: account.role, active: true })
        return null
      }
      if (!supabase) return 'Authentication is not configured yet.'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    signOut: async () => {
      if (!supabase) {
        window.localStorage.removeItem(demoSessionKey)
        window.sessionStorage.removeItem(demoSessionKey)
        setSession(null)
        setProfile(null)
        return
      }
      await supabase.auth.signOut()
    },
    refreshProfile: async () => loadProfile(session?.user.id),
  }), [loading, session, profile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

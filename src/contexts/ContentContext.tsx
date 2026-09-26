import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

export type SiteContent = {
  id: string
  page: string
  section_key: string
  section_label: string
  title: string
  body: string
  image_url: string
  button_text: string
  button_url: string
  layout: string
  sort_order: number
  published: boolean
  updated_at?: string
}

type ContentFallback = Omit<SiteContent, 'id' | 'page' | 'section_key' | 'updated_at'>
type ContentContextValue = {
  entries: SiteContent[]
  loading: boolean
  refresh: () => Promise<void>
  content: (page: string, key: string, fallback: Partial<ContentFallback>) => SiteContent
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<SiteContent[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin' && profile.active

  // Super admins also see unpublished sections, for the content editor.
  const refresh = async () => {
    if (!isSupabaseConfigured) return setLoading(false)
    try {
      setEntries(await api<SiteContent[]>(isSuperAdmin ? '/admin/site-content' : '/site-content', { auth: isSuperAdmin }))
    } catch {
      // Pages fall back to their built-in copy when content cannot be loaded.
    }
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [isSuperAdmin])

  const value = useMemo<ContentContextValue>(() => ({
    entries,
    loading,
    refresh,
    content: (page, key, fallback) => entries.find(entry => entry.page === page && entry.section_key === key && entry.published) ?? {
      id: '',
      page,
      section_key: key,
      section_label: fallback.section_label ?? key,
      title: fallback.title ?? '',
      body: fallback.body ?? '',
      image_url: fallback.image_url ?? '',
      button_text: fallback.button_text ?? '',
      button_url: fallback.button_url ?? '',
      layout: fallback.layout ?? 'text',
      sort_order: fallback.sort_order ?? 0,
      published: fallback.published ?? true,
    },
  }), [entries, loading, isSuperAdmin])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const context = useContext(ContentContext)
  if (!context) throw new Error('useContent must be used inside ContentProvider')
  return context
}

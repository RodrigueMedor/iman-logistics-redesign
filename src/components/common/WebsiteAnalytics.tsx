import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { apiUrl } from '../../services/api'

const visitorStorageKey = 'iman_analytics_visitor'
const sessionStorageKey = 'iman_analytics_session'
let lastTrackedPath = ''

const storedId = (storage: Storage, key: string) => {
  let value = storage.getItem(key)
  if (!value) {
    value = crypto.randomUUID()
    storage.setItem(key, value)
  }
  return value
}

// First-party, privacy-conscious page analytics. The server hashes both IDs
// before storage and never stores IP addresses or raw browser identifiers.
export function WebsiteAnalytics() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (navigator.webdriver || navigator.doNotTrack === '1' || pathname.startsWith('/admin') || pathname.startsWith('/content-admin') || pathname.startsWith('/tracking/team')) return
    if (lastTrackedPath === pathname) return
    lastTrackedPath = pathname
    try {
      const body = JSON.stringify({
        path: pathname,
        visitorId: storedId(localStorage, visitorStorageKey),
        sessionId: storedId(sessionStorage, sessionStorageKey),
      })
      void fetch(apiUrl('/analytics/page-view'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined)
    } catch {
      // Tracking must never interfere with the public website.
    }
  }, [pathname])

  return null
}

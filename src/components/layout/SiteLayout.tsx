import { useEffect } from 'react'
import { Box, Fab } from '@mui/material'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { ManagedSections } from '../common/ManagedSections'
import { WebsiteAnalytics } from '../common/WebsiteAnalytics'

const pageName = (pathname: string) => pathname === '/' ? 'home' : pathname.split('/').filter(Boolean)[0] || 'home'

export function SiteLayout() {
  const { pathname, hash } = useLocation()
  // New page: go to the top, or to the #section in the link once the
  // (lazy-loaded) page has rendered it.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    // Images and data above the section keep loading after it appears and push
    // it down, so re-align for a couple of seconds unless the visitor scrolls.
    const id = decodeURIComponent(hash.slice(1))
    let attempts = 0
    let aligned = 0
    let stopped = false
    const stop = () => { stopped = true }
    const events = ['wheel', 'touchstart', 'keydown'] as const
    events.forEach(name => window.addEventListener(name, stop, { passive: true }))
    const timer = window.setInterval(() => {
      attempts += 1
      const target = document.getElementById(id)
      if (target && !stopped) {
        target.scrollIntoView({ block: 'start' })
        aligned += 1
      }
      if (stopped || aligned >= 12 || attempts >= 45) window.clearInterval(timer)
    }, 200)
    return () => {
      window.clearInterval(timer)
      events.forEach(name => window.removeEventListener(name, stop))
    }
  }, [pathname, hash])
  return <>
    <WebsiteAnalytics />
    <Box component="a" href="#main" sx={{ position: 'fixed', top: -100, left: 8, zIndex: 2000, bgcolor: 'background.paper', color: 'text.primary', p: 1, '&:focus': { top: 8 } }}>Skip to content</Box>
    <Header />
    <Box component="main" id="main" minHeight="50vh"><Outlet /><ManagedSections page={pageName(pathname)} /></Box>
    <Footer />
    <Fab size="small" color="primary" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ position: 'fixed', right: 18, bottom: 18 }}><KeyboardArrowUpIcon /></Fab>
  </>
}

import { useEffect } from 'react'
import { Box, Fab } from '@mui/material'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { ManagedSections } from '../common/ManagedSections'

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
    let attempts = 0
    const timer = window.setInterval(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      attempts += 1
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (target || attempts >= 30) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [pathname, hash])
  return <>
    <Box component="a" href="#main" sx={{ position: 'fixed', top: -100, left: 8, zIndex: 2000, bgcolor: 'background.paper', color: 'text.primary', p: 1, '&:focus': { top: 8 } }}>Skip to content</Box>
    <Header />
    <Box component="main" id="main" minHeight="50vh"><Outlet /><ManagedSections page={pageName(pathname)} /></Box>
    <Footer />
    <Fab size="small" color="primary" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ position: 'fixed', right: 18, bottom: 18 }}><KeyboardArrowUpIcon /></Fab>
  </>
}

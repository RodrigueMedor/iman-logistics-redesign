import { useEffect } from 'react'
import { Box, Fab } from '@mui/material'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function SiteLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <>
    <Box component="a" href="#main" sx={{ position: 'fixed', top: -100, left: 8, zIndex: 2000, bgcolor: 'background.paper', color: 'text.primary', p: 1, '&:focus': { top: 8 } }}>Skip to content</Box>
    <Header />
    <Box component="main" id="main" minHeight="50vh"><Outlet /></Box>
    <Footer />
    <Fab size="small" color="primary" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ position: 'fixed', right: 18, bottom: 18 }}><KeyboardArrowUpIcon /></Fab>
  </>
}

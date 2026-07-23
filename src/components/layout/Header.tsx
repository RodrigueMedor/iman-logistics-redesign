import { useState } from 'react'
import { AppBar, Box, Container, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import logo from '../../assets/images/logo-2048x755.png'
import darkLogo from '../../assets/images/imanSlogogolden-copy-2.png'
import { useColorMode } from '../../contexts/ColorModeContext'

const links = [
  ['Freight Dispatch Masterclass', '/'],
  ['Freight Broker Masterclass', '/freight-broker-masterclass/'],
  ['Iman Trucking School', '/iman-trucking-school/'],
  ['Consultants', '/consultants/'],
  ['About Us', '/about-us/'],
  ['Contact Us', '/contact-us/'],
] as const

export function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { mode, toggleMode } = useColorMode()
  const modeLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  const isActiveRoute = (href: string) => {
    const route = href === '/' ? '/' : href.replace(/\/+$/, '')
    const current = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
    return route === '/' ? current === '/' : current === route || current.startsWith(`${route}/`)
  }
  return (
    <AppBar position="static" color="inherit" elevation={0} component="header" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Container>
        <Toolbar disableGutters sx={{ minHeight: { xs: 76, md: 100 }, justifyContent: 'space-between' }}>
          <Box component={RouterLink} to="/" aria-label="Iman Logistics home" sx={{ display: 'block', width: { xs: 150, md: 190 }, lineHeight: 0 }}>
            <Box component="img" src={mode === 'dark' ? darkLogo : logo} alt="Iman Logistics" sx={{ width: '100%', height: 70, objectFit: 'contain' }} />
          </Box>
          <Box component="nav" aria-label="Main navigation" sx={{ display: { xs: 'none', lg: 'flex' }, gap: 3 }}>
            {links.map(([label, href]) => {
              const active = isActiveRoute(href)
              return (
                <Box
                  key={href}
                  component={RouterLink}
                  to={href}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: active ? 'primary.main' : 'text.secondary',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    transition: 'color 280ms ease, font-weight 280ms ease',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -9,
                      height: 3,
                      borderRadius: 3,
                      bgcolor: 'primary.main',
                      transform: active ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: active ? 'left center' : 'right center',
                      transition: 'transform 280ms ease',
                    },
                    '&:hover': { color: 'primary.main', '&::after': { transform: 'scaleX(1)', transformOrigin: 'left center' } },
                  }}
                >
                  {label}
                </Box>
              )
            })}
          </Box>
          <Stack direction="row" alignItems="center">
            <Tooltip title={modeLabel}><IconButton aria-label={modeLabel} onClick={toggleMode} color="primary">{mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}</IconButton></Tooltip>
            <IconButton aria-label="Open navigation menu" onClick={() => setOpen(true)} sx={{ display: { lg: 'none' }, color: 'primary.main' }}><MenuIcon /></IconButton>
          </Stack>
        </Toolbar>
      </Container>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 310, pt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1 }}><IconButton aria-label="Close navigation menu" onClick={() => setOpen(false)}><CloseIcon /></IconButton></Box>
          <List>
            {links.map(([label, href]) => {
              const active = isActiveRoute(href)
              return (
                <ListItemButton
                  component={RouterLink}
                  to={href}
                  key={href}
                  selected={active}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  sx={{
                    position: 'relative',
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 1.5,
                    color: active ? 'primary.main' : 'text.primary',
                    transition: 'color 280ms ease, background-color 280ms ease',
                    '& .MuiListItemText-primary': {
                      fontWeight: active ? 700 : 500,
                      transition: 'font-weight 280ms ease',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      bottom: 3,
                      height: 3,
                      borderRadius: 3,
                      bgcolor: 'primary.main',
                      transform: active ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left center',
                      transition: 'transform 280ms ease',
                    },
                    '&.Mui-selected': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemText primary={label} />
                </ListItemButton>
              )
            })}
            <ListItemButton onClick={toggleMode}>
              <ListItemIcon>{mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}</ListItemIcon>
              <ListItemText primary={modeLabel} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  )
}

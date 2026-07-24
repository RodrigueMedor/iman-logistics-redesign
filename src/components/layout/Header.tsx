import { useState, type MouseEvent } from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import logo from '../../assets/images/logo-2048x755.png'
import darkLogo from '../../assets/images/imanSlogogolden-copy-2.png'
import { useColorMode } from '../../contexts/ColorModeContext'

const services = [
  ['Freight Dispatcher', '/freight-dispatch-masterclass/'],
  ['Freight Broker Masterclass', '/freight-broker-masterclass/'],
  ['Iman Trucking School', '/iman-trucking-school/'],
  ['Shipment Tracking', '/tracking/'],
] as const

const primaryLinks = [
  ['Car & Truck Sales', '/car-auto-sales/'],
  ['About', '/about-us/'],
  ['Contact', '/contact-us/'],
] as const

const normalizePath = (path: string) => path === '/' ? '/' : path.replace(/\/+$/, '')

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [servicesAnchor, setServicesAnchor] = useState<HTMLElement | null>(null)
  const { pathname } = useLocation()
  const { mode, toggleMode } = useColorMode()
  const modeLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  const currentPath = normalizePath(pathname)

  const isActiveRoute = (href: string) => {
    const route = normalizePath(href)
    return route === '/' ? currentPath === '/' : currentPath === route || currentPath.startsWith(`${route}/`)
  }

  const groupIsActive = (items: readonly (readonly [string, string])[]) =>
    items.some(([, href]) => isActiveRoute(href))

  const openMenu = (setter: (element: HTMLElement) => void) =>
    (event: MouseEvent<HTMLButtonElement>) => setter(event.currentTarget)

  const closeMenus = () => {
    setServicesAnchor(null)
  }

  const navButtonSx = {
    minWidth: 'auto',
    px: 1.5,
    py: 1,
    borderRadius: 2,
    color: 'text.secondary',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
  } as const

  const renderMenu = (
    anchor: HTMLElement | null,
    close: () => void,
    items: readonly (readonly [string, string])[],
  ) => (
    <Menu
      anchorEl={anchor}
      open={Boolean(anchor)}
      onClose={close}
      slotProps={{
        paper: {
          elevation: 8,
          sx: {
            mt: 1.25,
            minWidth: 260,
            p: 0.75,
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            boxShadow: mode === 'light'
              ? '0 18px 50px rgba(10, 0, 90, 0.14)'
              : '0 18px 50px rgba(0, 0, 0, 0.38)',
          },
        },
      }}
    >
      {items.map(([label, href]) => (
        <MenuItem
          key={href}
          component={RouterLink}
          to={href}
          selected={isActiveRoute(href)}
          onClick={closeMenus}
          sx={{ minHeight: 46, borderRadius: 2, px: 1.5, fontSize: 14, fontWeight: isActiveRoute(href) ? 700 : 500 }}
        >
          {label}
        </MenuItem>
      ))}
    </Menu>
  )

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      component="header"
      sx={{
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: mode === 'light' ? 'rgba(255,255,255,0.94)' : 'rgba(21,24,36,0.94)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <Box sx={{ bgcolor: mode === 'light' ? '#0A005A' : '#090B18', color: 'white' }}>
        <Container>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ minHeight: 32 }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', opacity: 0.78 }}>
              Logistics · Education · Growth
            </Typography>
            <Box
              component={RouterLink}
              to="/consultants/"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                gap: 0.5,
                color: 'inherit',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 700,
                '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 },
              }}
            >
              Speak with a consultant <ArrowOutwardRoundedIcon sx={{ fontSize: 14 }} />
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 74, md: 84 }, gap: 2 }}>
          <Box
            component={RouterLink}
            to="/"
            aria-label="Iman Logistics home"
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              width: { xs: 148, md: 174 },
              mr: 'auto',
              lineHeight: 0,
            }}
          >
            <Box
              component="img"
              src={mode === 'dark' ? darkLogo : logo}
              alt="Iman Logistics"
              sx={{ width: '100%', height: { xs: 52, md: 60 }, objectFit: 'contain', objectPosition: 'left center' }}
            />
          </Box>

          <Stack component="nav" aria-label="Main navigation" direction="row" alignItems="center" spacing={0.25} sx={{ display: { xs: 'none', lg: 'flex' } }}>
            <Button component={RouterLink} to="/" aria-current={isActiveRoute('/') ? 'page' : undefined} sx={{ ...navButtonSx, color: isActiveRoute('/') ? 'primary.main' : 'text.secondary', bgcolor: isActiveRoute('/') ? 'action.selected' : 'transparent' }}>Home</Button>
            <Button
              onClick={openMenu(setServicesAnchor)}
              endIcon={<KeyboardArrowDownRoundedIcon sx={{ transition: 'transform 180ms ease', transform: servicesAnchor ? 'rotate(180deg)' : 'none' }} />}
              aria-haspopup="menu"
              aria-expanded={Boolean(servicesAnchor)}
              sx={{ ...navButtonSx, color: groupIsActive(services) ? 'primary.main' : 'text.secondary', bgcolor: groupIsActive(services) ? 'action.selected' : 'transparent' }}
            >
              Services
            </Button>
            {primaryLinks.map(([label, href]) => (
              <Button
                key={href}
                component={RouterLink}
                to={href}
                aria-current={isActiveRoute(href) ? 'page' : undefined}
                sx={{ ...navButtonSx, color: isActiveRoute(href) ? 'primary.main' : 'text.secondary', bgcolor: isActiveRoute(href) ? 'action.selected' : 'transparent' }}
              >
                {label}
              </Button>
            ))}
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' }, my: 2.5, mx: 0.5 }} />
          <Tooltip title={modeLabel}>
            <IconButton aria-label={modeLabel} onClick={toggleMode} sx={{ width: 40, height: 40, color: 'text.secondary' }}>
              {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Button
            component={RouterLink}
            to="/consultants/"
            variant="contained"
            disableElevation
            endIcon={<ArrowOutwardRoundedIcon />}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              minHeight: 42,
              px: 2.25,
              ml: 0.5,
              borderRadius: 2.5,
              boxShadow: '0 8px 22px rgba(10, 0, 90, 0.18)',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 26px rgba(10, 0, 90, 0.24)' },
              transition: 'transform 180ms ease, box-shadow 180ms ease',
            }}
          >
            Book a consultation
          </Button>
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { lg: 'none' }, width: 42, height: 42, ml: 0.25, color: 'primary.main', border: 1, borderColor: 'divider', borderRadius: 2.5 }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>

      {renderMenu(servicesAnchor, () => setServicesAnchor(null), services)}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: 'min(88vw, 360px)', sm: 380 }, bgcolor: 'background.paper' } }}
      >
        <Stack sx={{ minHeight: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2 }}>
            <Box component="img" src={mode === 'dark' ? darkLogo : logo} alt="Iman Logistics" sx={{ width: 150, height: 52, objectFit: 'contain', objectPosition: 'left center' }} />
            <IconButton aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider />
          <Box sx={{ px: 1.5, py: 2, overflowY: 'auto' }}>
            <Typography sx={{ px: 1.5, pb: 0.75, color: 'text.secondary', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Explore
            </Typography>
            <List disablePadding>
              {[['Home', '/'] as const, ...services, ...primaryLinks].map(([label, href]) => (
                <ListItemButton
                  component={RouterLink}
                  to={href}
                  key={href}
                  selected={isActiveRoute(href)}
                  aria-current={isActiveRoute(href) ? 'page' : undefined}
                  onClick={() => setDrawerOpen(false)}
                  sx={{ borderRadius: 2.5, mb: 0.5 }}
                >
                  <ListItemText primary={label} primaryTypographyProps={{ fontWeight: isActiveRoute(href) ? 700 : 600 }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
          <Box sx={{ mt: 'auto', p: 2.5, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Ready to move your logistics career or business forward?
            </Typography>
            <Button component={RouterLink} to="/consultants/" variant="contained" fullWidth endIcon={<ArrowOutwardRoundedIcon />} onClick={() => setDrawerOpen(false)} sx={{ minHeight: 48, borderRadius: 2.5 }}>
              Book a consultation
            </Button>
            <Button onClick={toggleMode} fullWidth startIcon={mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />} sx={{ mt: 1, color: 'text.secondary' }}>
              {modeLabel}
            </Button>
          </Box>
        </Stack>
      </Drawer>
    </AppBar>
  )
}

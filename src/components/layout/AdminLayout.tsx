import { useEffect, useState, type ReactNode } from 'react'
import { AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined'
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type AppRole } from '../../contexts/AuthContext'
import { dashboardStats, type DashboardStats } from '../../services/backoffice'

const drawerWidth = 270
const everyone: AppRole[] = ['super_admin', 'admin']
const superOnly: AppRole[] = ['super_admin']
type NavItem = { label: string; path: string; icon: ReactNode; roles: AppRole[]; exact?: boolean; hint?: string; badge?: (stats: DashboardStats) => number | undefined }
// Grouped so every item fits on one line and the whole menu fits on a laptop screen.
const navigation: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [
    { label: 'Dashboard', path: '/admin/', icon: <DashboardOutlinedIcon />, roles: everyone },
  ] },
  { section: 'Inbox', items: [
    { label: 'Contact messages', path: '/admin/contacts/', icon: <MailOutlineRoundedIcon />, roles: everyone, hint: 'new messages', badge: stats => stats.contacts.new },
    { label: 'Bookings', path: '/admin/bookings/', icon: <EventAvailableOutlinedIcon />, roles: everyone, hint: 'bookings awaiting confirmation', badge: stats => stats.bookings.pending },
    { label: 'Applications', path: '/admin/applications/', icon: <WorkOutlineRoundedIcon />, roles: everyone, hint: 'new applications', badge: stats => stats.applications.new },
  ] },
  { section: 'Dispatch Masterclass', items: [
    { label: 'Registrations', path: '/admin/dispatch-masterclass/', icon: <SchoolOutlinedIcon />, roles: everyone, exact: true, hint: 'registrations awaiting payment', badge: stats => stats.brokerRegistrations.awaitingPayment },
    { label: 'Class sessions', path: '/admin/dispatch-masterclass/classes/', icon: <EventNoteOutlinedIcon />, roles: everyone },
  ] },
  { section: 'Broker Master Class', items: [
    { label: 'Registrations', path: '/admin/broker-masterclass/', icon: <SchoolOutlinedIcon />, roles: everyone, exact: true, hint: 'registrations awaiting payment', badge: stats => stats.brokerMasterclassRegistrations?.awaitingPayment },
    { label: 'Class sessions', path: '/admin/broker-masterclass/classes/', icon: <EventNoteOutlinedIcon />, roles: everyone },
  ] },
  { section: 'Business', items: [
    { label: 'Payments', path: '/admin/payments/', icon: <PaymentsOutlinedIcon />, roles: everyone, hint: 'pending payments', badge: stats => stats.payments.pending },
    { label: 'Customers', path: '/admin/customers/', icon: <PeopleAltOutlinedIcon />, roles: everyone },
    { label: 'Shipments', path: '/admin/shipments/', icon: <LocalShippingOutlinedIcon />, roles: everyone, hint: 'shipment exceptions', badge: stats => stats.shipments.exceptions },
    { label: 'Notifications', path: '/admin/notifications/', icon: <NotificationsNoneRoundedIcon />, roles: everyone },
  ] },
  { section: 'Administration', items: [
    { label: 'Work orders', path: '/admin/work-orders/', icon: <AssignmentOutlinedIcon />, roles: superOnly },
    { label: 'Users & roles', path: '/admin/users/', icon: <GroupOutlinedIcon />, roles: superOnly },
    { label: 'Audit log', path: '/admin/audit/', icon: <HistoryRoundedIcon />, roles: superOnly },
    { label: 'Website content', path: '/content-admin/', icon: <DashboardCustomizeOutlinedIcon />, roles: superOnly },
  ] },
]
const roleLabels: Record<AppRole, string> = { super_admin: 'SUPER ADMIN', admin: 'ADMIN', employee: 'EMPLOYEE' }

export function AdminLayout() {
  const { pathname } = useLocation()
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  // Counts of items needing attention; refreshed whenever staff move between pages.
  useEffect(() => {
    if (!profile || !everyone.includes(profile.role)) return
    let active = true
    dashboardStats().then(data => { if (active) setStats(data) }).catch(() => {})
    return () => { active = false }
  }, [pathname, profile])

  const drawer = <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#081a31', color: 'white' }}>
    <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
      <Typography fontWeight={950} letterSpacing={1.4} fontSize={18} lineHeight={1.2} noWrap>IMAN LOGISTICS</Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mt={.5}>
        <Typography color="rgba(255,255,255,.55)" fontSize={10} fontWeight={800} letterSpacing={.9} noWrap>OPERATIONS CONTROL</Typography>
        <Chip label={profile ? roleLabels[profile.role] : 'STAFF'} size="small" sx={{ bgcolor: 'rgba(218,168,47,.16)', color: '#f2ca67', fontWeight: 900, fontSize: 9.5, height: 20, flexShrink: 0, '& .MuiChip-label': { px: .9 } }} />
      </Stack>
    </Box>
    <Divider sx={{ borderColor: 'rgba(255,255,255,.1)' }} />
    <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,.15)', borderRadius: 3 } }}>
      {navigation.map(group => {
        const items = group.items.filter(item => profile && item.roles.includes(profile.role))
        if (!items.length) return null
        return <List key={group.section} dense disablePadding subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,.42)', fontSize: 10.5, fontWeight: 900, letterSpacing: 1.1, lineHeight: 1, px: 1.25, pt: 1.5, pb: .5, textTransform: 'uppercase' }}>{group.section}</ListSubheader>}>
          {items.map(item => {
            const selected = item.path === '/admin/' || item.exact ? pathname === item.path : pathname.startsWith(item.path)
            const count = stats && item.badge ? item.badge(stats) ?? 0 : 0
            return <ListItemButton key={item.path} component={RouterLink} to={item.path} selected={selected} onClick={() => setMobileOpen(false)} sx={{ borderRadius: 2, mb: .25, py: .45, minHeight: 34, color: 'rgba(255,255,255,.72)', '&:hover': { bgcolor: 'rgba(255,255,255,.06)', color: '#fff' }, '&.Mui-selected': { bgcolor: 'rgba(218,168,47,.16)', color: '#f2ca67' }, '&.Mui-selected:hover': { bgcolor: 'rgba(218,168,47,.22)' } }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36, '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 800, fontSize: 13.5, noWrap: true }} />
              {count > 0 && <Tooltip title={`${count} ${item.hint}`} placement="right"><Box component="span" sx={{ minWidth: 22, height: 20, px: .75, borderRadius: 10, bgcolor: '#e30613', color: '#fff', fontSize: 11, fontWeight: 900, display: 'grid', placeItems: 'center' }}>{count > 99 ? '99+' : count}</Box></Tooltip>}
            </ListItemButton>
          })}
        </List>
      })}
    </Box>
    <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid rgba(255,255,255,.1)' }}>
      <Button component={RouterLink} to="/" target="_blank" fullWidth startIcon={<OpenInNewRoundedIcon />} sx={{ color: 'rgba(255,255,255,.68)', justifyContent: 'flex-start', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,.06)' } }}>View public website</Button>
    </Box>
  </Box>

  return <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fa' }}>
    <AppBar position="fixed" elevation={0} sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` }, bgcolor: 'rgba(255,255,255,.96)', color: 'text.primary', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(12px)' }}>
      <Toolbar sx={{ minHeight: 72 }}>
        <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }} aria-label="Open admin navigation"><MenuRoundedIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}><Typography fontWeight={900}>Administration</Typography><Typography variant="caption" color="text.secondary">Secure logistics operations portal</Typography></Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>{profile?.full_name?.charAt(0) || 'A'}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}><Typography fontWeight={900} fontSize={14}>{profile?.full_name || 'Staff'}</Typography><Typography variant="caption" color="text.secondary">{profile?.role === 'super_admin' ? 'Full access' : 'Back-office access'}</Typography></Box>
          <Tooltip title="Sign out"><IconButton onClick={() => void signOut()} aria-label="Sign out"><LogoutRoundedIcon /></IconButton></Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
    <Box component="nav" aria-label="Admin navigation">
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}>{drawer}</Drawer>
      <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, border: 0 } }}>{drawer}</Drawer>
    </Box>
    <Box component="main" sx={{ ml: { md: `${drawerWidth}px` }, pt: '72px', minHeight: '100vh' }}><Outlet /></Box>
  </Box>
}

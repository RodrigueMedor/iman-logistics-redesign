import { useState } from 'react'
import { AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
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
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type AppRole } from '../../contexts/AuthContext'

const drawerWidth = 270
const everyone: AppRole[] = ['super_admin', 'admin']
const superOnly: AppRole[] = ['super_admin']
const navigation = [
  { label: 'Dashboard', path: '/admin/', icon: <DashboardOutlinedIcon />, roles: everyone },
  { label: 'Contact messages', path: '/admin/contacts/', icon: <MailOutlineRoundedIcon />, roles: everyone },
  { label: 'Bookings', path: '/admin/bookings/', icon: <EventAvailableOutlinedIcon />, roles: everyone },
  { label: 'Applications', path: '/admin/applications/', icon: <WorkOutlineRoundedIcon />, roles: everyone },
  { label: 'Payments', path: '/admin/payments/', icon: <PaymentsOutlinedIcon />, roles: everyone },
  { label: 'Customers', path: '/admin/customers/', icon: <PeopleAltOutlinedIcon />, roles: everyone },
  { label: 'Shipments', path: '/admin/shipments/', icon: <LocalShippingOutlinedIcon />, roles: everyone },
  { label: 'Work orders', path: '/admin/work-orders/', icon: <AssignmentOutlinedIcon />, roles: superOnly },
  { label: 'Users & roles', path: '/admin/users/', icon: <GroupOutlinedIcon />, roles: superOnly },
  { label: 'Audit log', path: '/admin/audit/', icon: <HistoryRoundedIcon />, roles: superOnly },
  { label: 'Website content', path: '/content-admin/', icon: <DashboardCustomizeOutlinedIcon />, roles: superOnly },
]
const roleLabels: Record<AppRole, string> = { super_admin: 'SUPER ADMIN', admin: 'ADMIN', employee: 'EMPLOYEE' }

export function AdminLayout() {
  const { pathname } = useLocation()
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const drawer = <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#081a31', color: 'white' }}>
    <Box sx={{ px: 3, py: 3 }}>
      <Typography fontWeight={950} letterSpacing={1.4} fontSize={20}>IMAN LOGISTICS</Typography>
      <Typography color="rgba(255,255,255,.55)" fontSize={12} fontWeight={800} letterSpacing={1.2} mt={.5}>OPERATIONS CONTROL</Typography>
    </Box>
    <Divider sx={{ borderColor: 'rgba(255,255,255,.1)' }} />
    <Box sx={{ p: 2 }}>
      <Chip label={profile ? roleLabels[profile.role] : 'STAFF'} size="small" sx={{ bgcolor: 'rgba(218,168,47,.16)', color: '#f2ca67', fontWeight: 900 }} />
    </Box>
    <List sx={{ px: 1.5, pt: .5 }}>
      {navigation.filter(item => profile && item.roles.includes(profile.role)).map(item => {
        const selected = item.path === '/admin/' ? pathname === item.path : pathname.startsWith(item.path)
        return <ListItemButton key={item.path} component={RouterLink} to={item.path} selected={selected} onClick={() => setMobileOpen(false)} sx={{ borderRadius: 2.5, mb: .75, color: 'rgba(255,255,255,.72)', '&.Mui-selected': { bgcolor: 'rgba(218,168,47,.16)', color: '#f2ca67' }, '&.Mui-selected:hover': { bgcolor: 'rgba(218,168,47,.22)' } }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 42 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 800 }} />
        </ListItemButton>
      })}
    </List>
    <Box sx={{ mt: 'auto', p: 2 }}>
      <Button component={RouterLink} to="/" target="_blank" fullWidth startIcon={<OpenInNewRoundedIcon />} sx={{ color: 'rgba(255,255,255,.68)', justifyContent: 'flex-start' }}>View public website</Button>
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

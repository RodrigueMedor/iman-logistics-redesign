import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Chip, Container, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Seo } from '../components/common/Seo'
import { useAuth, type UserProfile } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'
import { createDemoEmployee, deleteDemoEmployee, getDemoEmployees, updateDemoEmployee } from '../services/demoAuth'

type TeamMember = UserProfile & { created_at?: string; email?: string }

const roleGuide = [
  ['Super admin', 'secondary', 'Everything, including work orders, users and roles, the audit log, and website content.'],
  ['Admin', 'primary', 'The back office: messages, bookings, applications, masterclasses, payments, customers, shipments, and notifications.'],
  ['Employee', 'default', 'The employee portal only: the work orders assigned to them.'],
] as const

export default function AdminUsers() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [role, setRole] = useState<'employee' | 'admin'>('employee')

  const loadMembers = async () => {
    if (!supabase && import.meta.env.DEV) {
      setMembers([
        { id: 'local-super-admin', full_name: 'Iman Super Admin', email: 'info@imanlogistics.com', role: 'super_admin', active: true },
        ...getDemoEmployees().map(employee => ({ id: employee.id, full_name: employee.fullName, email: employee.email, role: 'employee' as const, active: employee.active })),
      ])
      return
    }
    if (!supabase) return
    try {
      setMembers(await api<TeamMember[]>('/admin/users', { auth: true }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Users could not be loaded.')
    }
  }
  useEffect(() => { void loadMembers() }, [])

  const resetForm = () => { setEditingId(''); setFullName(''); setEmail(''); setPassword(''); setRole('employee') }
  const editMember = (member: TeamMember) => { setEditingId(member.id); setFullName(member.full_name); setEmail(member.email || ''); setPassword(''); setRole(member.role === 'admin' ? 'admin' : 'employee'); setError(''); setMessage('') }

  const submitUser = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (!supabase && import.meta.env.DEV) {
        if (editingId) updateDemoEmployee(editingId, { fullName: fullName.trim(), email: email.trim(), ...(password ? { password } : {}) })
        else createDemoEmployee({ fullName: fullName.trim(), email: email.trim(), password })
        setMessage(editingId ? 'Employee updated.' : `${fullName.trim()}'s temporary employee account was created.`)
        resetForm()
        await loadMembers()
        return
      }
      const body = { fullName: fullName.trim(), email: email.trim(), password: password || undefined, role }
      const result = editingId
        ? await api<{ message: string }>(`/admin/users/${editingId}`, { method: 'PATCH', body, auth: true })
        : await api<{ message: string }>('/admin/users', { body, auth: true })
      setMessage(result.message || (editingId ? 'User updated.' : 'Account created.'))
      resetForm()
      await loadMembers()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create user.')
    } finally {
      setSaving(false)
    }
  }

  const changeActive = async (member: TeamMember) => {
    setError(''); setMessage('')
    try {
      if (!supabase && import.meta.env.DEV) updateDemoEmployee(member.id, { active: !member.active })
      else {
        await api(`/admin/users/${member.id}`, { method: 'PATCH', body: { active: !member.active }, auth: true })
      }
      setMessage(member.active ? 'Employee access suspended.' : 'Employee access restored.')
      await loadMembers()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update access.') }
  }

  const removeMember = async (member: TeamMember) => {
    if (!window.confirm(`Permanently delete ${member.full_name}? This cannot be undone.`)) return
    setError(''); setMessage('')
    try {
      if (!supabase && import.meta.env.DEV) deleteDemoEmployee(member.id)
      else {
        await api(`/admin/users/${member.id}`, { method: 'DELETE', auth: true })
      }
      setMessage('Employee deleted.')
      if (editingId === member.id) resetForm()
      await loadMembers()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete employee.') }
  }

  return <>
    <Seo title="User Administration | Iman Logistics" canonical="/admin/users/" />
    <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 6, md: 8 } }}><Container><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}><Box><Chip label="SUPER ADMIN ONLY" color="secondary" sx={{ mb: 2, fontWeight: 900 }} /><Typography variant="h2" component="h1" sx={{ fontSize: { xs: 40, md: 58 } }}>User administration</Typography><Typography color="rgba(255,255,255,.75)" mt={1}>Create employee and admin access without sharing super-admin credentials.</Typography></Box></Stack></Container></Box>
    <Container sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={4} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 5 }}><Paper component="form" onSubmit={submitUser} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}><Stack spacing={2.25}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" spacing={1.5} alignItems="center"><GroupAddOutlinedIcon color="primary" /><Typography variant="h5" fontWeight={900}>{editingId ? 'Edit user' : 'Create user'}</Typography></Stack>{editingId && <Button size="small" onClick={resetForm}>Cancel</Button>}</Stack><Alert severity="info">Only {profile?.full_name || 'the super admin'} can manage accounts.</Alert>{error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}<TextField required label="Full name" value={fullName} onChange={event => setFullName(event.target.value)} /><TextField required type="email" label="Email address" value={email} onChange={event => setEmail(event.target.value)} /><TextField required={!editingId} type="password" label={editingId ? 'New password (optional)' : 'Temporary password'} helperText={editingId ? 'Leave blank to keep the current password.' : 'Use at least 10 characters.'} inputProps={{ minLength: 10 }} value={password} onChange={event => setPassword(event.target.value)} />{supabase && <TextField select label="Role" value={role} onChange={event => setRole(event.target.value as 'employee' | 'admin')} helperText={role === 'admin' ? 'Back office: messages, bookings, applications, payments, customers, shipments.' : 'Employee portal: assigned work orders only.'}><MenuItem value="employee">Employee</MenuItem><MenuItem value="admin">Admin</MenuItem></TextField>}<Button type="submit" variant="contained" size="large" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account'}</Button></Stack></Paper>
          <Paper sx={{ p: { xs: 3, md: 4 }, mt: 3, borderRadius: 4, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={900} mb={2}>Roles &amp; access</Typography>
            <Stack spacing={1.75}>
              {roleGuide.map(([label, color, text]) => <Stack key={label} direction="row" spacing={1.5} alignItems="flex-start">
                <Chip size="small" label={label} color={color} sx={{ fontWeight: 800, minWidth: 104, flexShrink: 0, '& .MuiChip-label': { overflow: 'visible' } }} />
                <Typography variant="body2" color="text.secondary">{text}</Typography>
              </Stack>)}
            </Stack>
            <Alert severity="warning" variant="outlined" sx={{ mt: 2.5 }}>Suspended accounts can’t sign in, but their history stays in the audit log. Delete only accounts created by mistake.</Alert>
          </Paper></Grid>
        <Grid size={{ xs: 12, md: 7 }}><Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}><Typography variant="h5" fontWeight={900} mb={3}>Authorized team</Typography><Stack spacing={1.5}>{members.map(member => <Paper variant="outlined" key={member.id} sx={{ p: 2.25, borderRadius: 3, opacity: member.active ? 1 : .62 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Box><Typography fontWeight={900}>{member.full_name || 'Unnamed user'}</Typography>{member.email && <Typography variant="body2" color="text.secondary">{member.email}</Typography>}<Stack direction="row" spacing={1} mt={1}><Chip size="small" label={member.role === 'super_admin' ? 'Super admin' : member.role === 'admin' ? 'Admin' : 'Employee'} color={member.role === 'super_admin' ? 'secondary' : member.role === 'admin' ? 'primary' : 'default'} sx={{ fontWeight: 800 }} /><Chip size="small" label={member.active ? 'Active' : 'Suspended'} color={member.active ? 'success' : 'warning'} variant="outlined" /></Stack></Box>{member.role !== 'super_admin' && <Stack direction="row" spacing={.5} alignItems="center" sx={{ flexShrink: 0 }}><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => editMember(member)}>Edit</Button><Button size="small" color={member.active ? 'warning' : 'success'} onClick={() => void changeActive(member)}>{member.active ? 'Suspend' : 'Activate'}</Button><Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void removeMember(member)}>Delete</Button></Stack>}</Stack></Paper>)}{!members.length && <Typography color="text.secondary">No profiles are available yet.</Typography>}</Stack></Paper></Grid>
      </Grid>
    </Container>
  </>
}

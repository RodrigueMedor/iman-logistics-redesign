import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Chip, Container, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { useAuth, type UserProfile } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { createDemoEmployee, deleteDemoEmployee, getDemoEmployees, updateDemoEmployee } from '../services/demoAuth'

type TeamMember = UserProfile & { created_at?: string; email?: string }

export default function AdminUsers() {
  const { session, profile, signOut } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')

  const loadMembers = async () => {
    if (!supabase && import.meta.env.DEV) {
      setMembers([
        { id: 'local-super-admin', full_name: 'Iman Super Admin', email: 'superadmin@imanlogistics.com', role: 'super_admin', active: true },
        ...getDemoEmployees().map(employee => ({ id: employee.id, full_name: employee.fullName, email: employee.email, role: 'employee' as const, active: employee.active })),
      ])
      return
    }
    if (!supabase) return
    const { data } = await supabase!.from('profiles').select('id, full_name, email, role, active, created_at').order('created_at')
    setMembers((data as TeamMember[] | null) ?? [])
  }
  useEffect(() => { void loadMembers() }, [])

  const resetForm = () => { setEditingId(''); setFullName(''); setEmail(''); setPassword('') }
  const editMember = (member: TeamMember) => { setEditingId(member.id); setFullName(member.full_name); setEmail(member.email || ''); setPassword(''); setError(''); setMessage('') }

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
      const response = await fetch(editingId ? '/.netlify/functions/admin-manage-user' : '/.netlify/functions/admin-create-user', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ id: editingId || undefined, fullName: fullName.trim(), email: email.trim(), password: password || undefined }),
      })
      const responseText = await response.text()
      const result = responseText ? JSON.parse(responseText) as { error?: string; message?: string } : {}
      if (!response.ok) throw new Error(result.error || 'Unable to create user.')
      setMessage(result.message || (editingId ? 'Employee updated.' : 'Employee account created.'))
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
        const response = await fetch('/.netlify/functions/admin-manage-user', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ id: member.id, active: !member.active }) })
        const result = await response.json() as { error?: string }
        if (!response.ok) throw new Error(result.error || 'Unable to update access.')
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
        const response = await fetch('/.netlify/functions/admin-manage-user', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ id: member.id }) })
        const result = await response.json() as { error?: string }
        if (!response.ok) throw new Error(result.error || 'Unable to delete employee.')
      }
      setMessage('Employee deleted.')
      if (editingId === member.id) resetForm()
      await loadMembers()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete employee.') }
  }

  return <>
    <Seo title="User Administration | Iman Logistics" canonical="/tracking/admin/users/" />
    <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 6, md: 8 } }}><Container><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}><Box><Chip label="SUPER ADMIN ONLY" color="secondary" sx={{ mb: 2, fontWeight: 900 }} /><Typography variant="h2" component="h1" sx={{ fontSize: { xs: 40, md: 58 } }}>User administration</Typography><Typography color="rgba(255,255,255,.75)" mt={1}>Create employee access without sharing administrator credentials.</Typography></Box><Stack direction="row" spacing={1} alignItems="center"><Button component={RouterLink} to="/tracking/admin/work-orders/" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.55)' }}>Work orders</Button><Button onClick={() => void signOut()} variant="contained" color="secondary" startIcon={<LogoutRoundedIcon />}>Sign out</Button></Stack></Stack></Container></Box>
    <Container sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={4} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 5 }}><Paper component="form" onSubmit={submitUser} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}><Stack spacing={2.25}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" spacing={1.5} alignItems="center"><GroupAddOutlinedIcon color="primary" /><Typography variant="h5" fontWeight={900}>{editingId ? 'Edit employee' : 'Create employee'}</Typography></Stack>{editingId && <Button size="small" onClick={resetForm}>Cancel</Button>}</Stack><Alert severity="info">Only {profile?.full_name || 'the super admin'} can manage accounts.</Alert>{error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}<TextField required label="Full name" value={fullName} onChange={event => setFullName(event.target.value)} /><TextField required type="email" label="Email address" value={email} onChange={event => setEmail(event.target.value)} /><TextField required={!editingId} type="password" label={editingId ? 'New password (optional)' : 'Temporary password'} helperText={editingId ? 'Leave blank to keep the current password.' : 'Use at least 10 characters.'} inputProps={{ minLength: 10 }} value={password} onChange={event => setPassword(event.target.value)} /><Button type="submit" variant="contained" size="large" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save employee changes' : 'Create employee account'}</Button></Stack></Paper></Grid>
        <Grid size={{ xs: 12, md: 7 }}><Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: 1, borderColor: 'divider' }}><Typography variant="h5" fontWeight={900} mb={3}>Authorized team</Typography><Stack spacing={1.5}>{members.map(member => <Paper variant="outlined" key={member.id} sx={{ p: 2.25, borderRadius: 3, opacity: member.active ? 1 : .62 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Box><Typography fontWeight={900}>{member.full_name || 'Unnamed user'}</Typography>{member.email && <Typography variant="body2" color="text.secondary">{member.email}</Typography>}<Stack direction="row" spacing={1} mt={1}><Chip size="small" label={member.role === 'super_admin' ? 'Super admin' : 'Employee'} color={member.role === 'super_admin' ? 'secondary' : 'default'} sx={{ fontWeight: 800 }} /><Chip size="small" label={member.active ? 'Active' : 'Suspended'} color={member.active ? 'success' : 'warning'} variant="outlined" /></Stack></Box>{member.role === 'employee' && <Stack direction="row" spacing={.5} alignItems="center" flexWrap="wrap"><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => editMember(member)}>Edit</Button><Button size="small" color={member.active ? 'warning' : 'success'} onClick={() => void changeActive(member)}>{member.active ? 'Suspend' : 'Activate'}</Button><Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void removeMember(member)}>Delete</Button></Stack>}</Stack></Paper>)}{!members.length && <Typography color="text.secondary">No profiles are available yet.</Typography>}</Stack></Paper></Grid>
      </Grid>
    </Container>
  </>
}

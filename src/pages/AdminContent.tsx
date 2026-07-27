import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Chip, Container, FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { supabase } from '../lib/supabase'
import { useContent, type SiteContent } from '../contexts/ContentContext'
import { Seo } from '../components/common/Seo'
import { contentPages } from '../config/contentPages'
import { useSearchParams } from 'react-router-dom'

const emptyContent = { page: 'home', section_key: 'custom-', section_label: '', title: '', body: '', image_url: '', button_text: '', button_url: '', layout: 'image-right', sort_order: 100, published: true }

export default function AdminContent() {
  const { entries, refresh } = useContent()
  const [searchParams] = useSearchParams()
  const requestedPage = searchParams.get('page')
  const initialPage = contentPages.some(page => page.value === requestedPage) ? requestedPage! : 'all'
  const [editing, setEditing] = useState<Partial<SiteContent>>({ ...emptyContent, page: initialPage === 'all' ? 'home' : initialPage })
  const [pageFilter, setPageFilter] = useState(initialPage)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { void refresh() }, [])
  const filtered = useMemo(() => entries.filter(entry => pageFilter === 'all' || entry.page === pageFilter), [entries, pageFilter])
  const reset = () => setEditing({ ...emptyContent, page: pageFilter === 'all' ? 'home' : pageFilter })

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return setError('Supabase is required to save website content.')
    setSaving(true); setError(''); setMessage('')
    const { id, updated_at: _updatedAt, ...fields } = editing
    const payload = { ...fields, section_key: fields.section_key?.trim(), updated_at: new Date().toISOString() }
    const result = id
      ? await supabase.from('site_content').update(payload).eq('id', id)
      : await supabase.from('site_content').insert(payload)
    setSaving(false)
    if (result.error) return setError(result.error.message)
    setMessage(id ? 'Content updated and published.' : 'Content section created.')
    reset()
    await refresh()
  }

  const remove = async (entry: SiteContent) => {
    if (!supabase || !window.confirm(`Delete “${entry.section_label || entry.title}” permanently?`)) return
    const { error: deleteError } = await supabase.from('site_content').delete().eq('id', entry.id)
    if (deleteError) return setError(deleteError.message)
    setMessage('Content section deleted.')
    if (editing.id === entry.id) reset()
    await refresh()
  }

  const upload = async (file: File) => {
    if (!supabase) return setError('Supabase storage is not configured.')
    setMessage('Uploading image…')
    const extension = file.name.split('.').pop() || 'jpg'
    const path = `website/${crypto.randomUUID()}.${extension}`
    const result = await supabase.storage.from('website-media').upload(path, file)
    if (result.error) return setError(result.error.message)
    const { data } = supabase.storage.from('website-media').getPublicUrl(path)
    setEditing(current => ({ ...current, image_url: data.publicUrl }))
    setMessage('Image uploaded. Save the content section to publish it.')
  }

  return <>
    <Seo title="Website Content | Iman Logistics" canonical="/content-admin/content/" />
    <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 5, md: 7 } }}><Container><Chip label="SUPER ADMIN CMS" color="secondary" sx={{ mb: 2, fontWeight: 900 }} /><Typography component="h1" variant="h2" sx={{ fontSize: { xs: 40, md: 58 } }}>Website content</Typography><Typography color="rgba(255,255,255,.76)" mt={1}>Create, update, publish, and remove text, images, buttons, and page sections without changing source code.</Typography></Container></Box>
    <Container sx={{ py: { xs: 5, md: 7 } }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {message && <Alert severity="success" onClose={() => setMessage('')} sx={{ mb: 3 }}>{message}</Alert>}
      <Grid container spacing={4} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 5 }}><Paper component="form" onSubmit={save} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, position: { lg: 'sticky' }, top: { lg: 96 } }}><Stack spacing={2.2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h5" fontWeight={900}>{editing.id ? 'Edit content' : 'Add content section'}</Typography>{editing.id && <Button onClick={reset}>Cancel</Button>}</Stack>
          <TextField select required label="Website page" value={editing.page || 'home'} onChange={event => setEditing({ ...editing, page: event.target.value })}>{contentPages.map(page => <MenuItem value={page.value} key={page.value}>{page.label}</MenuItem>)}</TextField>
          <TextField required label="Section key" helperText="Use custom-name for a new section shown on the public page." value={editing.section_key || ''} onChange={event => setEditing({ ...editing, section_key: event.target.value })} />
          <TextField required label="Section label" value={editing.section_label || ''} onChange={event => setEditing({ ...editing, section_label: event.target.value })} />
          <TextField label="Heading" value={editing.title || ''} onChange={event => setEditing({ ...editing, title: event.target.value })} />
          <TextField multiline minRows={5} label="Body text" value={editing.body || ''} onChange={event => setEditing({ ...editing, body: event.target.value })} />
          <TextField label="Image URL" value={editing.image_url || ''} onChange={event => setEditing({ ...editing, image_url: event.target.value })} />
          <Button component="label" variant="outlined" startIcon={<ImageOutlinedIcon />}>Upload image<input hidden type="file" accept="image/*" onChange={event => event.target.files?.[0] && void upload(event.target.files[0])} /></Button>
          {editing.image_url && <Box component="img" src={editing.image_url} alt="Content preview" sx={{ width: '100%', maxHeight: 190, objectFit: 'cover', borderRadius: 2 }} />}
          <Grid container spacing={2}><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Button text" value={editing.button_text || ''} onChange={event => setEditing({ ...editing, button_text: event.target.value })} /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Button link" value={editing.button_url || ''} onChange={event => setEditing({ ...editing, button_url: event.target.value })} /></Grid></Grid>
          <Grid container spacing={2}><Grid size={{ xs: 12, sm: 7 }}><TextField fullWidth select label="Layout" value={editing.layout || 'image-right'} onChange={event => setEditing({ ...editing, layout: event.target.value })}><MenuItem value="text">Text only</MenuItem><MenuItem value="image-right">Image right</MenuItem><MenuItem value="image-left">Image left</MenuItem></TextField></Grid><Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth type="number" label="Display order" value={editing.sort_order ?? 100} onChange={event => setEditing({ ...editing, sort_order: Number(event.target.value) })} /></Grid></Grid>
          <FormControlLabel control={<Switch checked={editing.published ?? true} onChange={event => setEditing({ ...editing, published: event.target.checked })} />} label="Published on website" />
          <Button type="submit" variant="contained" size="large" disabled={saving} startIcon={editing.id ? <EditOutlinedIcon /> : <AddRoundedIcon />}>{saving ? 'Saving…' : editing.id ? 'Update content' : 'Create content'}</Button>
        </Stack></Paper></Grid>
        <Grid size={{ xs: 12, lg: 7 }}><Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={3}><Box><Typography variant="h5" fontWeight={900}>Content library</Typography><Typography color="text.secondary">{filtered.length} managed sections</Typography></Box><TextField select size="small" label="Filter page" value={pageFilter} onChange={event => { const nextPage = event.target.value; setPageFilter(nextPage); if (!editing.id && nextPage !== 'all') setEditing(current => ({ ...current, page: nextPage })) }} sx={{ minWidth: 210 }}><MenuItem value="all">All pages</MenuItem>{contentPages.map(page => <MenuItem value={page.value} key={page.value}>{page.label}</MenuItem>)}</TextField></Stack>
          <Stack spacing={1.5}>{filtered.map(entry => <Paper variant="outlined" key={entry.id} sx={{ p: 2.5, borderRadius: 3, opacity: entry.published ? 1 : .65 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box minWidth={0}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Chip size="small" label={entry.page} /><Chip size="small" color={entry.published ? 'success' : 'default'} label={entry.published ? 'Published' : 'Draft'} variant="outlined" /></Stack><Typography fontWeight={900} mt={1.5}>{entry.section_label || entry.title}</Typography><Typography variant="body2" color="text.secondary">{entry.section_key}</Typography><Typography variant="body2" mt={1} noWrap>{entry.title}</Typography></Box><Stack direction="row" alignItems="center"><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(entry)}>Edit</Button><Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void remove(entry)}>Delete</Button></Stack></Stack></Paper>)}{!filtered.length && <Alert severity="info">No content records for this page yet. Use the editor to create the first section.</Alert>}</Stack>
        </Paper></Grid>
      </Grid>
    </Container>
  </>
}

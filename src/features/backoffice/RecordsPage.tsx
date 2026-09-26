import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Seo } from '../../components/common/Seo'
import { useAuth } from '../../contexts/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { deleteRecord, fileUrl, listRecords, updateRecord, type BackOfficeTable, type RecordRow } from '../../services/backoffice'

export type Option = { value: string; label: string; color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' }
export type Column = { key: string; label: string; render?: (row: RecordRow) => ReactNode; hideOnMobile?: boolean }
export type Filter = { key: string; label: string; options: Option[]; editable?: boolean }

export type RecordsConfig = {
  table: BackOfficeTable
  title: string
  subtitle: string
  canonical: string
  idKey?: string
  titleKey: string
  searchColumns: string[]
  searchPlaceholder: string
  columns: Column[]
  details: Column[]
  filters?: Filter[]
  notes?: boolean
  file?: { pathKey: string; nameKey: string; label: string }
  deletable?: boolean
  orderBy?: { column: string; ascending?: boolean }
  csvName: string
  headerAction?: (reload: () => void) => ReactNode
  renderDetail?: (row: RecordRow, reload: () => void) => ReactNode
}

const pageSize = 25

export function StatusChip({ value, options }: { value: unknown; options: Option[] }) {
  const option = options.find(item => item.value === value)
  return <Chip size="small" label={option?.label ?? String(value ?? '—')} color={option?.color ?? 'default'} sx={{ fontWeight: 800 }} />
}

export function RecordsPage(config: RecordsConfig) {
  const { profile } = useAuth()
  const idKey = config.idKey ?? 'id'
  const [rows, setRows] = useState<RecordRow[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<RecordRow | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError('')
    try {
      const result = await listRecords({ table: config.table, search: debouncedSearch, searchColumns: config.searchColumns, filters, orderBy: config.orderBy ?? { column: 'created_at' }, page, pageSize })
      setRows(result.rows)
      setCount(result.count)
      setSelected(current => current ? result.rows.find(row => row[idKey] === current[idKey]) ?? current : null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [config.table, config.searchColumns, config.orderBy, debouncedSearch, filters, page, idKey])

  useEffect(() => { void load() }, [load])

  const exportCsv = () => {
    const header = config.details.map(column => column.label)
    const lines = rows.map(row => config.details.map(column => String(row[column.key] ?? '')))
    const csv = [header, ...lines].map(line => line.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${config.csvName}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <Seo title={`${config.title} | Iman Logistics Back Office`} canonical={config.canonical} />
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} spacing={2} mb={3}>
        <Box><Typography component="h1" variant="h4" fontWeight={950}>{config.title}</Typography><Typography color="text.secondary" mt={.5}>{config.subtitle}</Typography></Box>
        <Stack direction="row" spacing={1}>{config.headerAction?.(load)}</Stack>
      </Stack>

      {!isSupabaseConfigured && <Alert severity="info" sx={{ mb: 3 }}>The back office needs Supabase. Add the values from <strong>.env.example</strong> and run the migrations in <strong>supabase/migrations</strong>.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: 1, borderColor: 'divider' }} elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField size="small" value={search} onChange={event => setSearch(event.target.value)} placeholder={config.searchPlaceholder} sx={{ flex: 1, minWidth: 220 }} slotProps={{ input: { startAdornment: <SearchOutlinedIcon color="action" sx={{ mr: 1 }} /> } }} />
          {config.filters?.map(filter => <TextField key={filter.key} select size="small" label={filter.label} value={filters[filter.key] ?? ''} onChange={event => { setFilters(current => ({ ...current, [filter.key]: event.target.value })); setPage(0) }} sx={{ minWidth: 170 }}>
            <MenuItem value="">All</MenuItem>
            {filter.options.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>)}
          <Button onClick={() => void load()} startIcon={<RefreshRoundedIcon />} disabled={loading}>Refresh</Button>
          <Button onClick={exportCsv} startIcon={<DownloadRoundedIcon />} disabled={!rows.length}>Export CSV</Button>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }} elevation={0}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{config.columns.map(column => <TableCell key={column.key} sx={{ fontWeight: 900, whiteSpace: 'nowrap', display: column.hideOnMobile ? { xs: 'none', md: 'table-cell' } : undefined }}>{column.label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map(row => <TableRow key={String(row[idKey])} hover selected={selected?.[idKey] === row[idKey]} onClick={() => setSelected(row)} sx={{ cursor: 'pointer' }}>
                {config.columns.map(column => <TableCell key={column.key} sx={{ py: 1.5, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', display: column.hideOnMobile ? { xs: 'none', md: 'table-cell' } : undefined }}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</TableCell>)}
              </TableRow>)}
              {!rows.length && <TableRow><TableCell colSpan={config.columns.length} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>{loading ? 'Loading…' : 'No records match your search.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={count} page={page} onPageChange={(_event, next) => setPage(next)} rowsPerPage={pageSize} rowsPerPageOptions={[pageSize]} />
      </Paper>
    </Container>

    <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)} sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 520 } } }}>
      {selected && <RecordDetail key={String(selected[idKey])} config={config} row={selected} idKey={idKey} canDelete={Boolean(config.deletable && profile?.role === 'super_admin')} onClose={() => setSelected(null)} onChanged={load} />}
    </Drawer>
  </>
}

function RecordDetail({ config, row, idKey, canDelete, onClose, onChanged }: { config: RecordsConfig; row: RecordRow; idKey: string; canDelete: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const editableFilters = config.filters?.filter(filter => filter.editable) ?? []
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries([...editableFilters.map(filter => [filter.key, String(row[filter.key] ?? '')]), ...(config.notes ? [['admin_notes', String(row.admin_notes ?? '')]] : [])]))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const id = row[idKey] as string
  const changed = Object.entries(draft).some(([key, value]) => value !== String(row[key] ?? ''))
  const filePath = config.file ? row[config.file.pathKey] as string | null : null

  const save = async () => {
    setSaving(true); setError(''); setMessage('')
    try {
      const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== String(row[key] ?? '')))
      await updateRecord(config.table, id, changes)
      setMessage('Changes saved.')
      await onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Changes could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Permanently delete ${String(row[config.titleKey] ?? 'this record')}? This cannot be undone.`)) return
    setError('')
    try {
      await deleteRecord(config.table, id)
      onClose()
      await onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The record could not be deleted.')
    }
  }

  const openFile = async () => {
    if (!filePath) return
    try {
      window.open(await fileUrl(filePath), '_blank', 'noopener,noreferrer')
    } catch {
      setError('The file could not be opened. It may not have finished uploading.')
    }
  }

  return <Box sx={{ p: 3 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
      <Box><Typography variant="overline" color="text.secondary" fontWeight={900}>{config.title}</Typography><Typography variant="h5" fontWeight={950}>{String(row[config.titleKey] ?? '—')}</Typography></Box>
      <IconButton onClick={onClose} aria-label="Close details"><CloseRoundedIcon /></IconButton>
    </Stack>

    {editableFilters.length > 0 || config.notes ? <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 3 }}>
      <Stack spacing={2}>
        {editableFilters.map(filter => <TextField key={filter.key} select size="small" label={filter.label} value={draft[filter.key] ?? ''} onChange={event => setDraft(current => ({ ...current, [filter.key]: event.target.value }))}>
          {filter.options.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>)}
        {config.notes && <TextField multiline minRows={3} label="Internal notes" value={draft.admin_notes ?? ''} onChange={event => setDraft(current => ({ ...current, admin_notes: event.target.value }))} helperText="Visible only to staff." />}
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={!changed || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Button>
          {canDelete && <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void remove()}>Delete</Button>}
        </Stack>
      </Stack>
    </Paper> : canDelete && <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void remove()} sx={{ mt: 2 }}>Delete</Button>}
    {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

    {config.file && filePath && <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={() => void openFile()} sx={{ mt: 2 }}>{config.file.label}: {String(row[config.file.nameKey] ?? 'file')}</Button>}

    {config.renderDetail?.(row, () => void onChanged())}

    <Divider sx={{ my: 3 }} />
    <Stack spacing={1.75}>
      {config.details.map(field => <Box key={field.key}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>{field.label}</Typography>
        <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{field.render ? field.render(row) : <Typography>{String(row[field.key] ?? '') || '—'}</Typography>}</Box>
      </Box>)}
    </Stack>
  </Box>
}

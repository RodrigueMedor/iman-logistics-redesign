import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import type { SvgIconComponent } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { useContent } from '../contexts/ContentContext'

export default function ContentDashboard() {
  const { entries } = useContent()
  const published = entries.filter(entry => entry.published).length
  const pages = new Set(entries.map(entry => entry.page)).size
  const images = entries.filter(entry => entry.image_url).length
  const stats: Array<{ Icon: SvgIconComponent; value: number; label: string }> = [
    { Icon: ArticleOutlinedIcon, value: entries.length, label: 'Content sections' },
    { Icon: VisibilityOutlinedIcon, value: published, label: 'Published' },
    { Icon: PublicOutlinedIcon, value: pages, label: 'Managed pages' },
    { Icon: ImageOutlinedIcon, value: images, label: 'Managed images' },
  ]
  return <>
    <Seo title="Website Studio | Iman Logistics" canonical="/content-admin/" />
    <Box sx={{ bgcolor: '#161044', color: 'white', py: { xs: 6, md: 8 } }}><Container><Chip label="WEBSITE MANAGEMENT" color="secondary" sx={{ mb: 2, fontWeight: 900 }} /><Typography component="h1" variant="h2" sx={{ fontSize: { xs: 42, md: 62 } }}>Content dashboard</Typography><Typography color="rgba(255,255,255,.75)" mt={1.5} maxWidth={720}>Manage the public Iman Logistics website independently from logistics operations.</Typography></Container></Box>
    <Container sx={{ py: { xs: 5, md: 7 } }}>
      <Grid container spacing={2.5}>{stats.map(({ Icon, value, label }) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={label}><Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}><Stack direction="row" justifyContent="space-between"><Box><Typography color="text.secondary" fontWeight={800}>{label}</Typography><Typography variant="h3" fontWeight={950} mt={1}>{value}</Typography></Box><Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'action.selected', color: 'primary.main' }}><Icon /></Box></Stack></Paper></Grid>)}</Grid>
      <Grid container spacing={3} mt={1}>
        <Grid size={{ xs: 12, md: 7 }}><Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, height: '100%' }}><Typography variant="h4" fontWeight={900}>Manage website content</Typography><Typography color="text.secondary" mt={1.5}>Create page sections, update homepage messaging, upload images, edit buttons, control layouts, and publish or save drafts.</Typography><Button component={RouterLink} to="/content-admin/content/" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 3 }}>Open content library</Button></Paper></Grid>
        <Grid size={{ xs: 12, md: 5 }}><Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, height: '100%', bgcolor: '#f7f2df' }}><Typography variant="h5" fontWeight={900}>Separate and focused</Typography><Typography color="text.secondary" mt={1.5}>Shipment management, work orders, and employees remain in the Operations Portal. This dashboard is dedicated only to the public website.</Typography><Button component={RouterLink} to="/" target="_blank" startIcon={<PublicOutlinedIcon />} sx={{ mt: 2.5 }}>View public website</Button></Paper></Grid>
      </Grid>
    </Container>
  </>
}

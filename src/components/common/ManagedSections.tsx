import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import { Link as RouterLink } from 'react-router-dom'
import { useContent } from '../../contexts/ContentContext'

export function ManagedSections({ page }: { page: string }) {
  const { entries } = useContent()
  const sections = entries
    .filter(entry => entry.page === page && entry.published && entry.section_key.startsWith('custom-'))
    .sort((a, b) => a.sort_order - b.sort_order)

  if (!sections.length) return null
  return <>{sections.map((section, index) => {
    const imageFirst = section.layout === 'image-left'
    const content = <Stack justifyContent="center" sx={{ py: { xs: 2, md: 5 } }}>
      <Typography color="secondary" fontSize={12} fontWeight={900} letterSpacing=".12em" textTransform="uppercase">{section.section_label}</Typography>
      <Typography component="h2" variant="h2" sx={{ mt: 1.5, fontSize: { xs: 38, md: 54 } }}>{section.title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 2, whiteSpace: 'pre-line', fontSize: 18, lineHeight: 1.75 }}>{section.body}</Typography>
      {section.button_text && section.button_url && <Button component={section.button_url.startsWith('http') ? 'a' : RouterLink} {...(section.button_url.startsWith('http') ? { href: section.button_url, target: '_blank', rel: 'noopener noreferrer' } : { to: section.button_url })} variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 3, alignSelf: 'flex-start' }}>{section.button_text}</Button>}
    </Stack>
    const image = section.image_url && <Box component="img" src={section.image_url} alt="" loading="lazy" sx={{ display: 'block', width: '100%', minHeight: 330, maxHeight: 520, objectFit: 'cover', borderRadius: 4, boxShadow: '0 22px 60px rgba(10,0,90,.15)' }} />
    return <Box component="section" key={section.id} sx={{ py: { xs: 8, md: 11 }, bgcolor: index % 2 ? 'action.hover' : 'background.default' }}><Container><Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">{imageFirst && image ? <><Grid size={{ xs: 12, md: 6 }}>{image}</Grid><Grid size={{ xs: 12, md: 6 }}>{content}</Grid></> : <><Grid size={{ xs: 12, md: image ? 6 : 12 }}>{content}</Grid>{image && <Grid size={{ xs: 12, md: 6 }}>{image}</Grid>}</>}</Grid></Container></Box>
  })}</>
}

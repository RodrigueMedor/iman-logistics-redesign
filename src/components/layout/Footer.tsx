import { Box, Container, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import footerLogo from '../../assets/images/imanSlogogolden-copy-2.png'
import { useContent } from '../../contexts/ContentContext'

export function Footer() {
  const { content } = useContent()
  const footer = content('global', 'footer', { title: 'Copyright © 2026 Iman Logistics | Powered by Iman Logistics', image_url: footerLogo })
  return (
    <Box component="footer" sx={{ bgcolor: '#0A005A', color: 'white', py: 5, textAlign: 'center' }}>
      <Container>
        <Box component="img" loading="lazy" src={footer.image_url || footerLogo} alt="Iman Logistics" sx={{ width: 220, maxWidth: '80%', mb: 2 }} />
        <Typography variant="body2">{footer.title}</Typography>
        <Stack direction="row" justifyContent="center" gap={3} sx={{ mt: 1.5 }}>
          <Link component={RouterLink} to="/privacy-policy/" color="inherit" variant="body2">Privacy Policy</Link>
          <Link component={RouterLink} to="/terms-and-conditions/" color="inherit" variant="body2">Terms &amp; Conditions</Link>
        </Stack>
      </Container>
    </Box>
  )
}

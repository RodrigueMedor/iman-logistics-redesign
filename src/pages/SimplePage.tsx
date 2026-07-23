import { Container, Typography } from '@mui/material'
import { Seo } from '../components/common/Seo'

export function SimplePage({ title, canonical, children }: { title: string; canonical: string; children?: React.ReactNode }) {
  return <>
    <Seo title={`${title.replace(/\b\w/g, c => c.toUpperCase())} - Iman Logistics`} canonical={canonical} />
    <Container sx={{ py: { xs: 8, md: 13 }, minHeight: 430 }}>
      {children && <>
        <Typography component="h1" variant="h2" color="primary" textAlign="center" sx={{ fontSize: { xs: 35, md: 55 }, mb: 5 }}>{title}</Typography>
        {children}
      </>}
    </Container>
  </>
}

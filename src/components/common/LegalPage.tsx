import type { ReactNode } from 'react'
import { Box, Container, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from './Seo'

export const LEGAL_CONTACT_EMAIL = 'info@imanlogistics.com'
export const LEGAL_EFFECTIVE_DATE = 'October 11, 2026'

export type LegalSection = { title: string; body: ReactNode }

// Shared layout for the Privacy Policy and Terms & Conditions pages.
export function LegalPage({ title, canonical, intro, sections }: { title: string; canonical: string; intro: ReactNode; sections: LegalSection[] }) {
  return <>
    <Seo title={`${title} - Iman Logistics`} canonical={canonical} />
    <Box sx={{ bgcolor: '#0A005A', color: 'white', py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Typography component="h1" variant="h2" sx={{ fontSize: { xs: 38, md: 54 }, mb: 1 }}>{title}</Typography>
        <Typography sx={{ opacity: 0.85 }}>Effective date: {LEGAL_EFFECTIVE_DATE}</Typography>
      </Container>
    </Box>
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography component="div" fontSize={17} sx={{ mb: 4 }}>{intro}</Typography>
      {sections.map((section, index) => <Box component="section" key={section.title} sx={{ mb: 4 }}>
        <Typography component="h2" variant="h5" fontWeight={800} color="primary" sx={{ mb: 1.5 }}>{index + 1}. {section.title}</Typography>
        <Typography component="div" fontSize={16} sx={{ '& p': { mt: 0, mb: 1.5 }, '& ul': { mt: 0, pl: 3 }, '& li': { mb: 0.75 } }}>{section.body}</Typography>
      </Box>)}
      <Typography variant="body2" color="text.secondary">
        See also our <Link component={RouterLink} to="/privacy-policy/">Privacy Policy</Link> and <Link component={RouterLink} to="/terms-and-conditions/">Terms &amp; Conditions</Link>.
      </Typography>
    </Container>
  </>
}

export const ContactEmail = () => <Link href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</Link>

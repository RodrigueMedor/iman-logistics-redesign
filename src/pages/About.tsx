import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { Seo } from '../components/common/Seo'
import { useContent } from '../contexts/ContentContext'
import { Reveal } from '../components/common/Reveal'
import { CountUp } from '../components/common/CountUp'
import portrait from '../assets/images/POLO234-scaled.png'
import dispatchImage from '../assets/images/SDFERGGF-scaled.png'
import mapImage from '../assets/images/mapusa-2048x1269.png'
import training1 from '../assets/images/1.png'
import training2 from '../assets/images/2.png'
import training3 from '../assets/images/3.png'

const values = [
  [ShieldOutlinedIcon, 'Integrity', 'We believe professional growth begins with honest guidance and a strong foundation.'],
  [HealthAndSafetyOutlinedIcon, 'Safety', 'Responsible practices and industry fundamentals are central to lasting success.'],
  [VerifiedOutlinedIcon, 'Reliability', 'Clear, structured learning helps people act with confidence and consistency.'],
  [FavoriteBorderOutlinedIcon, 'People First', 'Every learner arrives with different goals, questions, and experiences.'],
  [HandshakeOutlinedIcon, 'Professionalism', 'We teach practical communication, preparation, and professional standards.'],
  [AutoAwesomeOutlinedIcon, 'Continuous Growth', 'The industry evolves, and effective professionals keep learning with it.'],
] as const

const services = [
  [LocalShippingOutlinedIcon, 'Freight Dispatch Masterclass', 'Step-by-step training designed to help aspiring dispatchers understand the industry, daily workflows, carrier relationships, and growth.', '/', 'Explore dispatch training'],
  [BusinessCenterOutlinedIcon, 'Freight Broker Masterclass', 'Clear, actionable training that introduces the freight brokerage industry and the path toward becoming a professional broker.', '/freight-broker-masterclass/', 'Explore broker training'],
  [SchoolOutlinedIcon, 'Iman Trucking School', 'Practical preparation for people building the skills, knowledge, and confidence needed for a trucking career.', '/iman-trucking-school/', 'Explore trucking school'],
  [SupportAgentOutlinedIcon, 'Professional Consultation', 'Focused guidance for freight brokerage, trucking, dispatch services, or CDL training decisions.', '/consultants/', 'Schedule a consultation'],
] as const

const milestones = [
  ['Foundation', 'A commitment to make logistics and dispatch education clearer, more practical, and easier to act on.'],
  ['Training', 'Structured learning paths built around industry fundamentals, real workflows, and professional confidence.'],
  ['Expansion', 'Broader guidance for freight brokerage, trucking careers, dispatch services, and business questions.'],
  ['Today', 'A growing education platform focused on helping people move forward with a practical plan.'],
  ['Future', 'Continuing to strengthen learning experiences and support the next generation of logistics professionals.'],
] as const

export default function About() {
  const { content } = useContent()
  const hero = content('about-us', 'hero', {
    section_label: 'ABOUT IMAN LOGISTICS',
    title: 'Practical knowledge. Professional confidence. Real direction.',
    body: 'Iman Logistics empowers aspiring logistics professionals with clear, step-by-step education and the confidence to take meaningful action.',
    button_text: 'Schedule a consultation',
    button_url: '/consultants/',
  })
  const story = content('about-us', 'story', {
    section_label: 'OUR STORY',
    title: 'A clearer pathway into logistics',
    body: 'Whether someone is completely new to trucking or searching for a flexible career opportunity, our role is to simplify the process, remove unnecessary confusion, and provide tools that can be applied with confidence.',
  })
  const cta = content('about-us', 'cta', {
    section_label: 'NEXT STEP',
    title: 'Ready to take your next step?',
    body: 'Ask a question, explore a training path, or schedule focused guidance with Iman Logistics.',
    button_text: 'Contact us today',
    button_url: '/contact-us/',
  })
  return <>
    <Seo title="About Us - Iman Logistics" canonical="/about-us/" />
    <Box sx={{ position: 'relative', overflow: 'hidden', color: 'white', bgcolor: '#0A005A', py: { xs: 9, md: 15 }, backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,.14), transparent 27%), linear-gradient(135deg,#0A005A,#000081)' }}>
      <Box sx={{ position: 'absolute', inset: 0, opacity: .08, backgroundImage: 'linear-gradient(90deg, transparent 49%, white 50%, transparent 51%), linear-gradient(transparent 49%, white 50%, transparent 51%)', backgroundSize: '52px 52px' }} />
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={7} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Reveal>
              <Chip label="Building confidence for the road ahead" sx={{ bgcolor: 'rgba(255,255,255,.13)', color: 'white', fontWeight: 800, mb: 3 }} />
              <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 45, sm: 60, md: 76 }, lineHeight: 1.02, letterSpacing: '-.045em' }}>{hero.title}</Typography>
              <Typography fontSize={{ xs: 18, md: 21 }} color="rgba(255,255,255,.82)" mt={3} maxWidth={720}>{hero.body}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mt={4}>
                <Button component={RouterLink} to={hero.button_url || '/consultants/'} variant="contained" color="secondary" size="large">{hero.button_text}</Button>
                <Button component={RouterLink} to="/contact-us/" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.55)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.08)' } }}>Contact us</Button>
              </Stack>
            </Reveal>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Reveal delay={140}><Paper sx={{ p: 1.5, borderRadius: 5, bgcolor: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.22)', transform: { md: 'rotate(2deg)' } }}><Box component="img" src={portrait} alt="Iman Logistics educator" sx={{ display: 'block', width: '100%', maxHeight: 510, objectFit: 'cover', objectPosition: 'top', borderRadius: 4 }} /></Paper></Reveal>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Section eyebrow="Our story" title="Why Iman Logistics exists">
      <Grid container spacing={{ xs: 5, md: 9 }} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}><Reveal><Box component="img" loading="lazy" src={dispatchImage} alt="Freight Dispatch Masterclass training" sx={{ width: '100%', borderRadius: 4, boxShadow: '0 24px 60px rgba(10,0,90,.18)' }} /></Reveal></Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Reveal delay={100}><Typography variant="h3" color="primary" fontWeight={900}>{story.title}</Typography>
            <Typography mt={2} fontSize={18}>Iman Logistic is dedicated to empowering individuals with the skills and knowledge needed to succeed in the trucking and logistics industry. Our training provides a clear, practical, and step-by-step pathway to becoming a professional freight dispatcher from scratch.</Typography>
            <Typography mt={2} color="text.secondary">{story.body}</Typography>
            <Grid container spacing={2} mt={2}>
              <Grid size={{ xs: 12, sm: 6 }}><StoryCard icon={<TrackChangesOutlinedIcon />} title="Our mission" text="Build independence, professional confidence, and practical opportunity through structured learning." /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><StoryCard icon={<PsychologyOutlinedIcon />} title="Our vision" text="A future where aspiring logistics professionals can begin with clarity instead of guesswork." /></Grid>
            </Grid>
          </Reveal>
        </Grid>
      </Grid>
    </Section>

    <Section eyebrow="What guides us" title="Values built for the real world" gray>
      <Grid container spacing={3}>{values.map(([Icon, title, text], index) => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={title}><Reveal delay={index * 55} height="100%"><Card variant="outlined" sx={cardSx}><CardContent sx={{ p: 3.5 }}><Avatar sx={{ bgcolor: 'primary.main', width: 52, height: 52, mb: 2.5 }}><Icon /></Avatar><Typography variant="h6" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1}>{text}</Typography></CardContent></Card></Reveal></Grid>)}</Grid>
    </Section>

    <Section eyebrow="Why choose us" title="Learning designed around action">
      <Grid container spacing={3}>
        {[
          ['Structured from the ground up', 'Content begins with the fundamentals and builds toward professional workflows.'],
          ['Industry-focused knowledge', 'Lessons stay centered on the responsibilities, relationships, and decisions that matter.'],
          ['Clear communication', 'Complex processes are broken into understandable, practical steps.'],
          ['Flexible pathways', 'Explore dispatch, freight brokerage, trucking school, or focused consultation.'],
          ['Professional mindset', 'Confidence is built through preparation, systems, and responsible practice.'],
          ['Dedicated direction', 'Consultations help turn individual questions into a prioritized action plan.'],
        ].map(([title, text], index) => <Grid size={{ xs: 12, md: 6 }} key={title}><Reveal delay={index * 40}><Stack direction="row" spacing={2.5} p={3} sx={{ borderRadius: 3, '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color .2s' }}><Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 900 }}>{String(index + 1).padStart(2, '0')}</Avatar><Box><Typography variant="h6" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={0.5}>{text}</Typography></Box></Stack></Reveal></Grid>)}
      </Grid>
    </Section>

    <Section eyebrow="How we can help" title="Explore Iman Logistics" gray>
      <Grid container spacing={3}>{services.map(([Icon, title, description, href, action], index) => <Grid size={{ xs: 12, md: 6 }} key={title}><Reveal delay={index * 70} height="100%"><Card variant="outlined" sx={cardSx}><CardContent sx={{ p: 4 }}><Avatar sx={{ bgcolor: 'rgba(10,0,90,.10)', color: 'primary.main', width: 54, height: 54, mb: 2.5 }}><Icon /></Avatar><Typography variant="h5" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1.5}>{description}</Typography></CardContent><CardActions sx={{ px: 4, pb: 4 }}><Button component={RouterLink} to={href} endIcon={<ArrowForwardIcon />}>{action}</Button></CardActions></Card></Reveal></Grid>)}</Grid>
    </Section>

    <Box component="section" sx={{ bgcolor: '#0A005A', color: 'white', py: { xs: 8, md: 10 } }}>
      <Container><Grid container spacing={4} textAlign="center">{[[4, '', 'Learning and support paths'], [7, '', 'Core dispatch topics'], [5, '', 'Step-by-step guide modules'], [1, ':1', 'Consultation support']].map(([value, suffix, label]) => <Grid size={{ xs: 6, md: 3 }} key={label}><CountUp value={Number(value)} suffix={String(suffix)} label={String(label)} /></Grid>)}</Grid></Container>
    </Box>

    <Section eyebrow="The people behind the mission" title="Guidance with a human focus">
      <Grid container spacing={6} alignItems="center">
        <Grid size={{ xs: 12, md: 5 }}><Reveal><Box component="img" loading="lazy" src={portrait} alt="Iman Logistics team" sx={{ width: '100%', maxHeight: 570, objectFit: 'cover', objectPosition: 'top', borderRadius: 4 }} /></Reveal></Grid>
        <Grid size={{ xs: 12, md: 7 }}><Reveal delay={100}><Typography variant="h3" color="primary" fontWeight={900}>Iman Logistics Team</Typography><Typography variant="h6" color="secondary" mt={1}>Education, logistics, and learner support</Typography><Typography mt={3} fontSize={18}>Our work is centered on helping aspiring dispatchers and trucking professionals understand the industry, develop a strong foundation, and move forward with confidence.</Typography><Typography color="text.secondary" mt={2}>We believe effective instruction should feel direct, practical, and connected to the real responsibilities professionals face every day.</Typography></Reveal></Grid>
      </Grid>
    </Section>

    <Section eyebrow="Our direction" title="A journey built around progress" gray>
      <Box maxWidth={900} mx="auto">{milestones.map(([title, text], index) => <Reveal delay={index * 60} key={title}><Grid container spacing={3} pb={4}><Grid size={{ xs: 2, sm: 1 }}><Stack alignItems="center" height="100%"><Avatar sx={{ bgcolor: index === milestones.length - 1 ? 'secondary.main' : 'primary.main', width: 38, height: 38, fontSize: 14, fontWeight: 900 }}>{index + 1}</Avatar>{index < milestones.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 1 }} />}</Stack></Grid><Grid size={{ xs: 10, sm: 11 }}><Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}><Typography variant="h6" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1}>{text}</Typography></Paper></Grid></Grid></Reveal>)}</Box>
    </Section>

    <Section eyebrow="Community outcomes" title="Success starts with the right information">
      <Typography textAlign="center" color="text.secondary" maxWidth={760} mx="auto" mt={-3} mb={5}>Our public site features client success stories as video experiences. These learning themes reflect what the programs are built to support without inventing customer quotations.</Typography>
      <Grid container spacing={3}>{[[training1, 'Clarity', 'Understand the role, the workflow, and the responsibilities before taking action.'], [training2, 'Confidence', 'Build professional habits through practical, structured guidance.'], [training3, 'Direction', 'Turn information into a step-by-step plan for moving forward.']].map(([image, title, text]) => <Grid size={{ xs: 12, md: 4 }} key={title}><Card variant="outlined" sx={cardSx}><Box component="img" loading="lazy" src={image} alt="" sx={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} /><CardContent sx={{ p: 3 }}><Typography variant="h5" color="primary" fontWeight={900}>{title}</Typography><Typography color="text.secondary" mt={1}>{text}</Typography></CardContent></Card></Grid>)}</Grid>
    </Section>

    <Box sx={{ bgcolor: '#0A005A', color: 'white', textAlign: 'center', py: { xs: 8, md: 11 } }}><Container maxWidth="md"><Typography variant="h2" fontSize={{ xs: 38, md: 56 }}>{cta.title}</Typography><Typography mt={2} fontSize={19} color="rgba(255,255,255,.8)">{cta.body}</Typography><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={2} mt={4}><Button component={RouterLink} to={cta.button_url || '/contact-us/'} color="secondary" variant="contained" size="large">{cta.button_text}</Button><Button component={RouterLink} to="/consultants/" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'white' }}>Schedule consultation</Button></Stack></Container></Box>
  </>
}

function Section({ eyebrow, title, gray, children }: { eyebrow: string; title: string; gray?: boolean; children: React.ReactNode }) {
  return <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: theme => gray ? (theme.palette.mode === 'dark' ? '#10131e' : '#f7f8fb') : 'background.default' }}><Container><Reveal textAlign="center" maxWidth={800} mx="auto" mb={6}><Typography variant="overline" color="secondary" fontWeight={900} letterSpacing={1.4}>{eyebrow}</Typography><Typography component="h2" variant="h2" color="primary" sx={{ fontSize: { xs: 37, md: 54 }, mt: 1 }}>{title}</Typography></Reveal>{children}</Container></Box>
}

function StoryCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}><Avatar sx={{ bgcolor: 'primary.main', mb: 1.5 }}>{icon}</Avatar><Typography fontWeight={900} color="primary">{title}</Typography><Typography variant="body2" color="text.secondary" mt={.5}>{text}</Typography></Paper>
}

const cardSx = { height: '100%', borderRadius: 3.5, overflow: 'hidden', transition: 'transform .22s ease, box-shadow .22s ease, border-color .22s ease', '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 18px 45px rgba(10,0,90,.12)', borderColor: 'primary.main' } }

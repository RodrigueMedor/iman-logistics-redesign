import { lazy, Suspense } from 'react'
import { CircularProgress, Stack } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'

const Home = lazy(() => import('../pages/Home'))
const About = lazy(() => import('../pages/About'))
const Broker = lazy(() => import('../pages/Broker'))
const TruckingSchool = lazy(() => import('../pages/TruckingSchool'))
const Contact = lazy(() => import('../pages/Contact'))
const Consultation = lazy(() => import('../pages/Consultation'))
const Tracking = lazy(() => import('../pages/Tracking'))
const AutoSales = lazy(() => import('../pages/AutoSales'))
const Blank = lazy(() => import('../pages/Blank'))

function Loading() { return <Stack alignItems="center" justifyContent="center" minHeight="50vh"><CircularProgress /></Stack> }
export function AppRoutes() {
  return <Suspense fallback={<Loading />}><Routes>
    <Route element={<SiteLayout />}>
      <Route index element={<Home />} />
      <Route path="freight-broker-masterclass/" element={<Broker />} />
      <Route path="iman-trucking-school/" element={<TruckingSchool />} />
      <Route path="consultants/" element={<Consultation />} />
      <Route path="tracking/*" element={<Tracking />} />
      <Route path="car-auto-sales/*" element={<AutoSales />} />
      <Route path="about-us/" element={<About />} />
      <Route path="contact-us/" element={<Contact />} />
      <Route path="home/" element={<Blank canonical="/home/" title="Home" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes></Suspense>
}

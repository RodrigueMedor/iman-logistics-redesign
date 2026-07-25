import { lazy, Suspense } from 'react'
import { CircularProgress, Stack } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { AdminLayout } from '../components/layout/AdminLayout'

const Home = lazy(() => import('../pages/Home'))
const DispatchMasterclass = lazy(() => import('../pages/DispatchMasterclass'))
const About = lazy(() => import('../pages/About'))
const Broker = lazy(() => import('../pages/Broker'))
const TruckingSchool = lazy(() => import('../pages/TruckingSchool'))
const Contact = lazy(() => import('../pages/Contact'))
const Consultation = lazy(() => import('../pages/Consultation'))
const Tracking = lazy(() => import('../pages/Tracking'))
const TrackingAdmin = lazy(() => import('../pages/TrackingAdmin'))
const WorkOrders = lazy(() => import('../pages/WorkOrders'))
const EmployeeWorkOrders = lazy(() => import('../pages/EmployeeWorkOrders'))
const AutoSales = lazy(() => import('../pages/AutoSales'))
const AdminLogin = lazy(() => import('../pages/AdminLogin'))
const AdminUsers = lazy(() => import('../pages/AdminUsers'))
const Careers = lazy(() => import('../pages/Careers'))

function Loading() { return <Stack alignItems="center" justifyContent="center" minHeight="50vh"><CircularProgress /></Stack> }
export function AppRoutes() {
  return <Suspense fallback={<Loading />}><Routes>
    <Route path="admin/login/" element={<AdminLogin />} />
    <Route element={<ProtectedRoute roles={['super_admin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="tracking/admin/" element={<TrackingAdmin />} />
        <Route path="tracking/admin/work-orders/" element={<WorkOrders />} />
        <Route path="tracking/admin/users/" element={<AdminUsers />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['super_admin', 'employee']} />}>
      <Route path="tracking/team/work-orders/" element={<EmployeeWorkOrders />} />
    </Route>
    <Route element={<SiteLayout />}>
      <Route index element={<Home />} />
      <Route path="freight-dispatch-masterclass/" element={<DispatchMasterclass />} />
      <Route path="freight-broker-masterclass/" element={<Broker />} />
      <Route path="iman-trucking-school/" element={<TruckingSchool />} />
      <Route path="consultants/" element={<Consultation />} />
      <Route path="tracking/*" element={<Tracking />} />
      <Route path="car-auto-sales/*" element={<AutoSales />} />
      <Route path="careers/" element={<Careers />} />
      <Route path="about-us/" element={<About />} />
      <Route path="contact-us/" element={<Contact />} />
      <Route path="home/" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes></Suspense>
}

import { lazy, Suspense } from 'react'
import { CircularProgress, Stack } from '@mui/material'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { AdminLayout } from '../components/layout/AdminLayout'
import { ContentAdminLayout } from '../components/layout/ContentAdminLayout'
import { backOfficeRoles } from '../contexts/AuthContext'

const Home = lazy(() => import('../pages/Home'))
const DispatchMasterclass = lazy(() => import('../pages/DispatchMasterclass'))
const About = lazy(() => import('../pages/About'))
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
const AdminContent = lazy(() => import('../pages/AdminContent'))
const AdminResetPassword = lazy(() => import('../pages/AdminResetPassword'))
const ContentDashboard = lazy(() => import('../pages/ContentDashboard'))
const Dashboard = lazy(() => import('../pages/admin/Dashboard'))
const recordPages = () => import('../pages/admin/RecordPages')
const ContactsPage = lazy(() => recordPages().then(module => ({ default: module.ContactsPage })))
const BookingsPage = lazy(() => recordPages().then(module => ({ default: module.BookingsPage })))
const ApplicationsPage = lazy(() => recordPages().then(module => ({ default: module.ApplicationsPage })))
const PaymentsPage = lazy(() => recordPages().then(module => ({ default: module.PaymentsPage })))
const CustomersPage = lazy(() => recordPages().then(module => ({ default: module.CustomersPage })))
const AuditPage = lazy(() => recordPages().then(module => ({ default: module.AuditPage })))
const brokerPages = () => import('../pages/admin/FreightBrokerPages')
const BrokerRegistrationsPage = lazy(() => brokerPages().then(module => ({ default: module.BrokerRegistrationsPage })))
const BrokerClassesPage = lazy(() => brokerPages().then(module => ({ default: module.BrokerClassesPage })))
const NotificationsPage = lazy(() => brokerPages().then(module => ({ default: module.NotificationsPage })))

function Loading() { return <Stack alignItems="center" justifyContent="center" minHeight="50vh"><CircularProgress /></Stack> }
export function AppRoutes() {
  return <Suspense fallback={<Loading />}><Routes>
    <Route path="admin/login/" element={<AdminLogin />} />
    <Route path="admin/reset-password/" element={<AdminResetPassword />} />
    <Route path="tracking/admin/" element={<Navigate to="/admin/shipments/" replace />} />
    <Route path="admin/freight-broker/" element={<Navigate to="/admin/dispatch-masterclass/" replace />} />
    <Route path="admin/freight-broker/classes/" element={<Navigate to="/admin/dispatch-masterclass/classes/" replace />} />
    <Route path="tracking/admin/work-orders/" element={<Navigate to="/admin/work-orders/" replace />} />
    <Route path="tracking/admin/users/" element={<Navigate to="/admin/users/" replace />} />
    <Route element={<ProtectedRoute roles={backOfficeRoles} />}>
      <Route element={<AdminLayout />}>
        <Route path="admin/" element={<Dashboard />} />
        <Route path="admin/contacts/" element={<ContactsPage />} />
        <Route path="admin/bookings/" element={<BookingsPage />} />
        <Route path="admin/applications/" element={<ApplicationsPage />} />
        <Route path="admin/dispatch-masterclass/" element={<BrokerRegistrationsPage />} />
        <Route path="admin/dispatch-masterclass/classes/" element={<BrokerClassesPage />} />
        <Route path="admin/notifications/" element={<NotificationsPage />} />
        <Route path="admin/payments/" element={<PaymentsPage />} />
        <Route path="admin/customers/" element={<CustomersPage />} />
        <Route path="admin/shipments/" element={<TrackingAdmin />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['super_admin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="admin/work-orders/" element={<WorkOrders />} />
        <Route path="admin/users/" element={<AdminUsers />} />
        <Route path="admin/audit/" element={<AuditPage />} />
      </Route>
      <Route path="tracking/admin/content/" element={<Navigate to="/content-admin/content/" replace />} />
      <Route element={<ContentAdminLayout />}>
        <Route path="content-admin/" element={<ContentDashboard />} />
        <Route path="content-admin/content/" element={<AdminContent />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['super_admin', 'employee']} />}>
      <Route path="tracking/team/work-orders/" element={<EmployeeWorkOrders />} />
    </Route>
    <Route element={<SiteLayout />}>
      <Route index element={<Home />} />
      <Route path="freight-dispatch-masterclass/" element={<DispatchMasterclass />} />
      <Route path="freight-broker-masterclass/" element={<ToDispatchMasterclass />} />
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

// The Freight Broker Masterclass page was retired; keep old links (including
// #register) working by sending them to the Freight Dispatch Masterclass page.
function ToDispatchMasterclass() {
  const { hash } = useLocation()
  return <Navigate to={`/freight-dispatch-masterclass/${hash}`} replace />
}

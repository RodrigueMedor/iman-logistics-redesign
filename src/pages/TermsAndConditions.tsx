import { Link } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { ContactEmail, LegalPage } from '../components/common/LegalPage'
import { FREIGHT_BROKER_POLICY_TEXT } from '../features/freightBroker/program'

export default function TermsAndConditions() {
  return <LegalPage
    title="Terms & Conditions"
    canonical="/terms-and-conditions/"
    intro={<p>These Terms &amp; Conditions govern your use of imanlogistics.com and the services offered by Iman Logistics, including the Freight Dispatch Masterclass, consultations and related communications. By using the website or registering for a service, you agree to these terms.</p>}
    sections={[
      {
        title: 'Services',
        body: <p>Iman Logistics provides freight dispatch training, consulting and related logistics services. Course content, schedules, instructors and formats may be updated from time to time. Training is educational; we do not guarantee any particular income, employment or business result.</p>,
      },
      {
        title: 'Registration and accounts',
        body: <p>You agree to provide accurate, current information when you register and to keep your contact details up to date. Registrations are confirmed only after payment is received and a confirmation is issued. You are responsible for the use of any verification codes sent to you.</p>,
      },
      {
        title: 'Payments and registration policy',
        body: <>
          <p>Prices are shown in U.S. dollars at checkout. Payments are processed securely by Stripe.</p>
          <p>{FREIGHT_BROKER_POLICY_TEXT}</p>
          <p>Students accept this policy with an electronic signature before paying.</p>
        </>,
      },
      {
        title: 'Text message (SMS) program',
        body: <>
          <p><strong>Program:</strong> Iman Logistics Freight Dispatch Masterclass notifications.</p>
          <p><strong>Messages you may receive:</strong> one-time verification codes you request, a confirmation after your payment, and, only if you opt in on the registration form, payment reminders while your payment is pending.</p>
          <p><strong>Frequency:</strong> message frequency varies; payment reminders are sent at most once per day while a payment is pending.</p>
          <p><strong>Cost:</strong> Message and data rates may apply.</p>
          <p><strong>Opt out:</strong> reply <strong>STOP</strong> to any message to unsubscribe. You will receive one final message confirming you have been unsubscribed. Reply <strong>START</strong> to resubscribe.</p>
          <p><strong>Help:</strong> reply <strong>HELP</strong> to any message or email <ContactEmail />.</p>
          <p>Consent to receive text messages is not a condition of registration or purchase. Carriers are not liable for delayed or undelivered messages. See our <Link component={RouterLink} to="/privacy-policy/">Privacy Policy</Link> for how we handle your mobile number; we never share it for marketing purposes.</p>
        </>,
      },
      {
        title: 'Intellectual property',
        body: <p>All course materials, videos, documents and website content are owned by Iman Logistics or its licensors and are provided for your personal, non-commercial use. You may not copy, record, resell or redistribute them without our written permission.</p>,
      },
      {
        title: 'Acceptable use',
        body: <p>You agree not to misuse the website or services, including attempting unauthorized access, interfering with their operation, or submitting false or harmful information.</p>,
      },
      {
        title: 'Disclaimers and limitation of liability',
        body: <p>The website and services are provided "as is". To the fullest extent permitted by law, Iman Logistics is not liable for indirect, incidental or consequential damages arising from your use of the website or services, and our total liability for any claim is limited to the amount you paid for the service giving rise to the claim.</p>,
      },
      {
        title: 'Changes to these terms',
        body: <p>We may update these Terms &amp; Conditions from time to time. The effective date above shows when they were last changed. Continued use of the website or services after a change means you accept the updated terms.</p>,
      },
      {
        title: 'Contact us',
        body: <p>Questions about these terms? Email <ContactEmail />.</p>,
      },
    ]}
  />
}

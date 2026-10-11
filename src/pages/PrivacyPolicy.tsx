import { ContactEmail, LegalPage } from '../components/common/LegalPage'

export default function PrivacyPolicy() {
  return <LegalPage
    title="Privacy Policy"
    canonical="/privacy-policy/"
    intro={<p>Iman Logistics ("Iman Logistics", "we", "us") respects your privacy. This Privacy Policy explains what information we collect through imanlogistics.com and our services, including Freight Dispatch Masterclass registrations, consultations, career applications and text message (SMS) notifications, and how we use and protect it.</p>}
    sections={[
      {
        title: 'Information we collect',
        body: <ul>
          <li><strong>Information you give us:</strong> your name, email address, mobile phone number, mailing address, class and attendance choices, electronic signature, and anything you write in contact, consultation or career forms (including any résumé you upload).</li>
          <li><strong>Payment information:</strong> payments are processed by Stripe. We receive the payment status, amount and a transaction reference; we never receive or store your full card number.</li>
          <li><strong>Verification and consent records:</strong> when you verify your email address or phone number, or choose whether to receive SMS payment reminders, we record the choice, the consent wording shown to you and the time.</li>
          <li><strong>Website usage:</strong> we use our own privacy-conscious page analytics. Random visitor and session identifiers are kept in your browser storage and are hashed before we store them. We do not store IP addresses, full referrer URLs or browser user-agent strings for analytics.</li>
        </ul>,
      },
      {
        title: 'How we use your information',
        body: <ul>
          <li>To process registrations, bookings, payments and applications, and to provide the training and services you request.</li>
          <li>To send you service messages by email and, where applicable, by SMS: verification codes, registration and payment confirmations, class details and (only if you opt in) payment reminders.</li>
          <li>To respond to your questions and provide customer support.</li>
          <li>To keep records required for accounting, security, fraud prevention and legal compliance.</li>
          <li>To understand how our website is used and improve it.</li>
        </ul>,
      },
      {
        title: 'Text messaging (SMS)',
        body: <>
          <p>If you provide your mobile number, we may text you a one-time verification code you request, a confirmation after you pay, and, only if you choose "Yes, send me SMS payment reminders", reminders (at most one per day) while your payment is pending. Consent to receive text messages is not a condition of registration or purchase. Message and data rates may apply. Message frequency varies.</p>
          <p>Reply <strong>STOP</strong> to any message to unsubscribe, or <strong>HELP</strong> for help. You can also contact us at <ContactEmail />.</p>
          <p><strong>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. All of the categories of sharing described in this Privacy Policy exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.</strong></p>
        </>,
      },
      {
        title: 'How we share information',
        body: <>
          <p>We do not sell your personal information. We share it only with service providers that help us operate our services, under agreements that limit their use of it to providing those services to us:</p>
          <ul>
            <li>Stripe (payment processing)</li>
            <li>Twilio (text message delivery)</li>
            <li>Resend (email delivery)</li>
            <li>Supabase and our hosting provider (secure data storage and website hosting)</li>
          </ul>
          <p>We may also disclose information when required by law, to protect our rights or the safety of others, or as part of a business transfer such as a merger or acquisition. Mobile numbers and SMS consent are never shared for marketing, as described above.</p>
        </>,
      },
      {
        title: 'Data retention',
        body: <p>We keep registration, payment and consent records for as long as needed to provide our services and to meet legal, accounting and tax requirements. We delete or anonymize information when it is no longer needed.</p>,
      },
      {
        title: 'Security',
        body: <p>We use encryption in transit, access controls and reputable service providers to protect your information. No method of transmission or storage is completely secure, but we work to protect your information and limit access to staff who need it.</p>,
      },
      {
        title: 'Your choices and rights',
        body: <ul>
          <li>Reply STOP to stop text messages at any time.</li>
          <li>Ask us to access, correct or delete your personal information by emailing <ContactEmail />. We may keep records we are legally required to retain.</li>
          <li>You can clear your browser storage to reset the analytics identifiers.</li>
        </ul>,
      },
      {
        title: "Children's privacy",
        body: <p>Our services are intended for adults. We do not knowingly collect personal information from children under 13.</p>,
      },
      {
        title: 'Changes to this policy',
        body: <p>We may update this Privacy Policy from time to time. The effective date above shows when it was last changed.</p>,
      },
      {
        title: 'Contact us',
        body: <p>Questions about this Privacy Policy or your information? Email <ContactEmail />.</p>,
      },
    ]}
  />
}

insert into public.site_content (
  page, section_key, section_label, title, body, image_url, button_text, button_url, layout, sort_order, published
) values
  ('freight-dispatch-masterclass', 'cta', 'ENROLLMENT', 'Success belongs to those who possess the right information and are prepared to execute', 'Stop waiting. Secure your spot and take the next step.', '', 'Secure your spot', '', 'text', 90, true),
  ('freight-broker-masterclass', 'cta', 'NEXT STEP', 'Ready to explore freight brokerage?', 'Continue to the dedicated Freight Broker Masterclass website for program access and enrollment information.', '', 'Visit Masterclass Website', 'https://imanfreightbroker.com/', 'text', 90, true),
  ('iman-trucking-school', 'cta', 'NEXT STEP', 'Ready to explore trucking school?', 'Visit the dedicated Iman Trucking School website for current training options, schedules, requirements, and enrollment information.', '', 'Visit School Website', 'https://iman-trucking-school-website.netlify.app/', 'text', 90, true),
  ('consultants', 'benefits', 'WHY CONSULT', 'Why book a consultation?', 'One focused conversation can turn a complex challenge into a practical path forward.', '', '', '', 'text', 2, true),
  ('consultants', 'services', 'CONSULTATION OPTIONS', 'Choose your consultation', 'Compare focused sessions designed around the decisions that matter most to you.', '', '', '', 'text', 3, true),
  ('consultants', 'pricing', 'PRICING', 'Simple, transparent pricing', 'Every consultation includes expert preparation, your private session, and a clear set of next steps.', '', '', '', 'text', 4, true),
  ('tracking', 'form', 'TRACKING FORM', 'Track your shipment', 'Use the reference from your confirmation.', '', 'Track shipment', '', 'text', 2, true),
  ('tracking', 'support', 'SHIPMENT SUPPORT', 'Need help with a shipment?', 'Our team can help verify your reference and latest status.', '', 'Contact support', '/contact-us/', 'text', 3, true),
  ('car-auto-sales', 'cta', 'VEHICLE SALES', 'Tell us what you’re looking for', 'Continue to our dedicated sales website to explore vehicles and connect with the sales team.', '', 'Visit Car & Truck Sales', 'https://tiny-kringle-175161.netlify.app/', 'text', 90, true),
  ('careers', 'intro', 'WHY IMAN LOGISTICS', 'A workplace built around progress', 'Bring your experience, curiosity, and drive. We’ll provide a team environment where your contribution matters.', '', '', '', 'text', 2, true),
  ('careers', 'cta', 'JOIN OUR TEAM', 'Don’t see the right role?', 'Introduce yourself to our recruiting team. We welcome interest from qualified transportation and logistics professionals.', '', 'Send your information', '/contact-us/', 'text', 90, true),
  ('about-us', 'cta', 'NEXT STEP', 'Ready to take your next step?', 'Ask a question, explore a training path, or schedule focused guidance with Iman Logistics.', '', 'Contact us today', '/contact-us/', 'text', 90, true),
  ('contact-us', 'cta', 'CONTACT IMAN LOGISTICS', 'Let’s make your next step clearer.', 'Send your questions today or reserve a focused consultation when you’re ready for personalized guidance.', '', 'Contact Iman Logistics', '#contact-form', 'text', 90, true)
on conflict (page, section_key) do update set
  section_label = excluded.section_label,
  title = excluded.title,
  body = excluded.body,
  button_text = excluded.button_text,
  button_url = excluded.button_url,
  sort_order = excluded.sort_order;

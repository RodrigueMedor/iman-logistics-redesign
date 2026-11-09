-- Local development data only. `supabase db reset` loads this after the
-- migrations; it is never run against production.

insert into public.shipments (reference, status, origin, destination, estimated_delivery, progress, customer, carrier, events) values
  ('IMAN-12345', 'In transit', 'Miami, FL', 'Atlanta, GA', 'July 26, 2026 · Before 5:00 PM', 68, 'Demo Customer', 'Demo Carrier', '[
    {"label": "Shipment created", "location": "Miami, FL", "timestamp": "July 23 · 8:15 AM", "completed": true, "detail": "Shipment information was received and confirmed."},
    {"label": "Picked up", "location": "Miami, FL", "timestamp": "July 23 · 11:40 AM", "completed": true, "detail": "Freight was picked up from the origin facility."},
    {"label": "In transit", "location": "Gainesville, FL", "timestamp": "July 24 · 2:35 PM", "completed": true, "detail": "The shipment is moving toward its destination."},
    {"label": "Out for delivery", "location": "Atlanta, GA", "timestamp": "Pending", "completed": false, "detail": "The shipment will be assigned for final delivery."},
    {"label": "Delivered", "location": "Atlanta, GA", "timestamp": "Pending", "completed": false, "detail": "Delivery confirmation will appear here."}
  ]'::jsonb),
  ('IMAN-67890', 'Delivered', 'Dallas, TX', 'Houston, TX', 'Delivered July 23, 2026 · 1:18 PM', 100, 'Demo Customer', 'Demo Carrier', '[
    {"label": "Shipment created", "location": "Dallas, TX", "timestamp": "July 22 · 7:45 AM", "completed": true, "detail": "Shipment information was received and confirmed."},
    {"label": "Picked up", "location": "Dallas, TX", "timestamp": "July 22 · 10:20 AM", "completed": true, "detail": "Freight was picked up from the origin facility."},
    {"label": "In transit", "location": "Huntsville, TX", "timestamp": "July 23 · 8:05 AM", "completed": true, "detail": "The shipment moved toward its destination."},
    {"label": "Out for delivery", "location": "Houston, TX", "timestamp": "July 23 · 11:32 AM", "completed": true, "detail": "The shipment was assigned for final delivery."},
    {"label": "Delivered", "location": "Houston, TX", "timestamp": "July 23 · 1:18 PM", "completed": true, "detail": "Delivery was completed and confirmed."}
  ]'::jsonb)
on conflict (reference) do nothing;

-- Example upcoming Freight Broker Master Class session, so the "Upcoming
-- sessions" list on /freight-broker-masterclass/ is never empty locally.
-- Dates are relative to the reset so it always stays upcoming.
insert into public.freight_dispatch_masterclass_classes
  (program, name, description, price_cents, starts_at, ends_at, registration_deadline, days_of_week, class_time,
   delivery_mode, location, timezone, allows_online, allows_in_person, instructor_name, seat_capacity, status,
   online_instructions)
values
  ('broker_masterclass', 'Freight Broker Master Class — Example Session',
   'Start and run a freight brokerage: authority and bonding, finding shippers, carrier vetting, pricing, contracts, and getting paid.',
   52000,
   date_trunc('day', now()) + interval '28 days' + interval '14 hours',
   date_trunc('day', now()) + interval '32 days' + interval '18 hours',
   date_trunc('day', now()) + interval '25 days' + interval '5 hours',
   'Mon – Fri', '9:00 AM – 1:00 PM ET', 'online', 'Online / Zoom', 'America/New_York', true, false,
   'Iman Logistics instructor', 20, 'OPEN',
   'The Zoom link is emailed after your payment is confirmed.');

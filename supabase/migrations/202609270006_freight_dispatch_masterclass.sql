-- The registration form moved from the Freight Broker Masterclass page to the
-- Freight Dispatch Masterclass page, and the course is now the Freight
-- Dispatch Masterclass. Only rows still holding the old wording change, so
-- anything staff edited in the back office or content editor is kept.

update public.freight_dispatch_masterclass_classes
set name = replace(name, 'Freight Broker Masterclass', 'Freight Dispatch Masterclass')
where name like 'Freight Broker Masterclass%';

update public.freight_dispatch_masterclass_classes
set description = 'Step-by-step freight dispatch training: finding loads, carrier setup and paperwork, rate negotiation, compliance, and managing multiple trucks.'
where description in (
  'Step-by-step freight brokerage training: authority and compliance, shippers, carriers, pricing, and operations.',
  'Step-by-step Freight Dispatch Masterclass training: authority and compliance, shippers, carriers, pricing, and operations.'
);

-- The Broker page no longer has a registration form: its buttons go to Contact.
update public.site_content
set button_text = 'Contact our team', button_url = '/contact-us/'
where page = 'freight-broker-masterclass' and section_key in ('hero', 'cta') and button_url = '#register';

update public.site_content
set body = 'Review the program here, then contact our team to learn about upcoming availability.'
where page = 'freight-broker-masterclass' and section_key = 'curriculum'
  and body = 'Review the program here, then register below to reserve your seat.';

update public.site_content
set body = 'Talk with our team about the Freight Broker Masterclass and upcoming availability.'
where page = 'freight-broker-masterclass' and section_key = 'cta'
  and body like 'Continue to the dedicated Freight Broker Masterclass website%';

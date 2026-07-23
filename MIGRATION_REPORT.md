# Iman Logistics Migration Report

Audit date: 2026-07-23  
Source: https://imanlogistics.com/

## Site map and navigation

- `/` — Freight Dispatch Masterclass (primary landing page)
- `/freight-broker-masterclass/` — Freight Broker Masterclass
- `/iman-trucking-school/` — Iman Trucking School
- `/consultants/` — Consultants (header and footer only on the source)
- `/about-us/` — About Us
- `/contact-us/` — Contact Us form
- `/home/` — indexed legacy route (header and footer only on the source)

The shared desktop navigation contains the first six routes above. On smaller screens it collapses to a menu button. The homepage contains repeated external “Buy Now” CTAs to an Intuit Commerce payment page.

## Shared layout and components

- White header, dark-blue brand logo, centered horizontal navigation
- Mobile drawer navigation
- Main content container
- Repeated blue heading sections, red CTA buttons, image/video cards
- Footer with gold logo on a dark-blue background and copyright text
- Floating scroll-to-top control
- Contact form with Name, Email, Subject and Message fields

## Theme tokens

- Primary navy: `#0A005A`
- Supporting navy: `#000081`
- CTA red: `#FF0000`
- White: `#FFFFFF`
- Body text: `#080808`
- Muted gray: `#54595F`
- Source typography: Roboto for most content; Helvetica is used in several Elementor sections
- Common desktop headings: 35–65px; tablet/mobile sizes reduce progressively
- Body text: 15–21px
- Source layout uses Elementor-style centered containers, generous vertical section padding, small button radii, and restrained shadows

## Assets

The migration stores the visible source images locally under `src/assets/images`, including:

- Header and footer logos
- Dispatch hero artwork
- Five training module images
- Portrait image
- USA map artwork
- Video/testimonial artwork
- Site icon

## Responsive strategy

- Desktop: full horizontal navigation and multi-column content
- Tablet: reduced typography and two-column grids where space permits
- Mobile: menu drawer, single-column sections, full-width CTAs, stacked media/cards
- Breakpoints follow MUI defaults while reproducing source behavior at approximately 1200, 900, and 600px

## SEO and accessibility

- Per-route titles, canonical links, heading hierarchy, and source content are preserved
- Semantic landmarks, skip link, keyboard-accessible navigation, descriptive image alternatives, and labeled form inputs are included
- Routes are lazy-loaded and images use native lazy loading

## Forms and behavior

The contact form uses React Hook Form with a Zod schema. It provides required-field validation, email validation, loading, success, and error states. A transport adapter is isolated in `src/services/contact.ts`; the static migration currently uses a safe simulated submission because the WordPress form endpoint is not portable.

## Audit notes

- `/consultants/` and `/home/` intentionally contain no page body on the live source.
- No FAQ, gallery, or embedded third-party form was found.
- Homepage videos are presented as clickable video poster panels on the source. The migration preserves the poster/play treatment without inventing unavailable media endpoints.


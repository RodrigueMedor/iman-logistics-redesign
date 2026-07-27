create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section_key text not null,
  section_label text not null default '',
  title text not null default '',
  body text not null default '',
  image_url text not null default '',
  button_text text not null default '',
  button_url text not null default '',
  layout text not null default 'text' check (layout in ('text', 'image-right', 'image-left')),
  sort_order integer not null default 100,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page, section_key)
);

alter table public.site_content enable row level security;

drop policy if exists "public reads published website content" on public.site_content;
create policy "public reads published website content" on public.site_content
  for select
  using (published = true or public.is_super_admin());

drop policy if exists "super admins manage website content" on public.site_content;
create policy "super admins manage website content" on public.site_content
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

insert into storage.buckets (id, name, public)
values ('website-media', 'website-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads website media" on storage.objects;
create policy "public reads website media" on storage.objects
  for select using (bucket_id = 'website-media');

drop policy if exists "super admins upload website media" on storage.objects;
create policy "super admins upload website media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'website-media' and public.is_super_admin());

drop policy if exists "super admins update website media" on storage.objects;
create policy "super admins update website media" on storage.objects
  for update to authenticated
  using (bucket_id = 'website-media' and public.is_super_admin())
  with check (bucket_id = 'website-media' and public.is_super_admin());

drop policy if exists "super admins delete website media" on storage.objects;
create policy "super admins delete website media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'website-media' and public.is_super_admin());

insert into public.site_content (
  page, section_key, section_label, title, body, image_url, button_text, button_url, layout, sort_order, published
) values
  ('global', 'header', 'Logistics · Education · Growth', 'Speak with a consultant', 'Ready to move your logistics career or business forward?', '', 'Book a consultation', '/consultants/', 'text', 1, true),
  ('global', 'footer', 'Footer', 'Copyright © 2026 Iman Logistics | Powered by Iman Logistics', '', '', '', '', 'text', 2, true),
  ('home', 'hero', 'YOUR NEXT MOVE STARTS HERE', 'Build your future in logistics.', 'Training, consulting, and vehicle solutions designed to help ambitious people move forward with clarity.', '', 'Explore our services', '/freight-dispatch-masterclass/', 'text', 1, true),
  ('home', 'overview', 'WHAT WE DO', 'One company. More ways to move forward.', 'Choose the path that fits your goals today—and count on a team that understands where you want to go next.', '', '', '', 'text', 2, true),
  ('home', 'cta', 'CONSULTATION', 'Not sure which path is right for you?', 'Tell us what you’re working toward. We’ll help you identify the best next step.', '', 'Book a consultation', '/consultants/', 'text', 90, true)
on conflict (page, section_key) do nothing;

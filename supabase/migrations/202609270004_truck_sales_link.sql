-- Point the Car & Truck Sales page's sales-website buttons at the live sales
-- site. Only rows still using the old temporary address change, so any link
-- staff set in the content editor is kept.
update public.site_content
set button_url = 'https://www.imantrucksales.com'
where page = 'car-auto-sales'
  and button_url = 'https://tiny-kringle-175161.netlify.app/';

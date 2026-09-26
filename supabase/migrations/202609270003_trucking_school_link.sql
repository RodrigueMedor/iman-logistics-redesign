-- Point the Iman Trucking School page's "Visit School Website" buttons at the
-- school's live site. Only rows still using the old temporary address change,
-- so any link staff set in the content editor is kept.
update public.site_content
set button_url = 'https://imantruckingschool.com/'
where page = 'iman-trucking-school'
  and button_url = 'https://iman-trucking-school-website.netlify.app/';

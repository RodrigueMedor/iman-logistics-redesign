-- Name the course in the Freight Dispatch Masterclass hero. Only rows still
-- holding the original seeded text change, so staff edits are kept.
update public.site_content
set section_label = case when section_label = 'FREIGHT DISPATCH MASTERCLASS' then 'CAREER TRAINING' else section_label end,
    title = case when title = 'Become a Freight Dispatcher' then 'Freight Dispatch Masterclass' else title end
where page = 'freight-dispatch-masterclass' and section_key = 'hero'
  and (section_label = 'FREIGHT DISPATCH MASTERCLASS' or title = 'Become a Freight Dispatcher');

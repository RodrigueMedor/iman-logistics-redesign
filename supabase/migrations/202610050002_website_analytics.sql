-- Privacy-conscious first-party website analytics. Raw visitor/session IDs,
-- IP addresses, full referrers, and user-agent strings are never stored.
create table if not exists public.website_page_views (
  id bigint generated always as identity primary key,
  visitor_hash text not null check (length(visitor_hash) = 64),
  session_hash text not null check (length(session_hash) = 64),
  path text not null check (length(path) between 1 and 240 and path like '/%'),
  created_at timestamptz not null default now()
);

create index if not exists website_page_views_created_idx on public.website_page_views (created_at desc);
create index if not exists website_page_views_visitor_idx on public.website_page_views (visitor_hash, created_at desc);
create index if not exists website_page_views_path_idx on public.website_page_views (path, created_at desc);

alter table public.website_page_views enable row level security;
revoke all on public.website_page_views from public, anon, authenticated;
grant select, insert on public.website_page_views to service_role;
grant usage, select on sequence public.website_page_views_id_seq to service_role;

create or replace function public.admin_website_analytics()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_back_office() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'pageViews', jsonb_build_object(
      'today', (select count(*) from website_page_views where created_at >= current_date),
      'last7Days', (select count(*) from website_page_views where created_at >= now() - interval '7 days'),
      'last30Days', (select count(*) from website_page_views where created_at >= now() - interval '30 days'),
      'total', (select count(*) from website_page_views)
    ),
    'uniqueVisitors', jsonb_build_object(
      'today', (select count(distinct visitor_hash) from website_page_views where created_at >= current_date),
      'last7Days', (select count(distinct visitor_hash) from website_page_views where created_at >= now() - interval '7 days'),
      'last30Days', (select count(distinct visitor_hash) from website_page_views where created_at >= now() - interval '30 days'),
      'total', (select count(distinct visitor_hash) from website_page_views)
    ),
    'sessions', jsonb_build_object(
      'today', (select count(distinct session_hash) from website_page_views where created_at >= current_date),
      'last30Days', (select count(distinct session_hash) from website_page_views where created_at >= now() - interval '30 days')
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'pageViews', page_views, 'uniqueVisitors', unique_visitors) order by day), '[]'::jsonb)
      from (
        select d::date as day,
          count(v.id) as page_views,
          count(distinct v.visitor_hash) as unique_visitors
        from generate_series(current_date - 13, current_date, interval '1 day') d
        left join website_page_views v on v.created_at >= d and v.created_at < d + interval '1 day'
        group by d::date
      ) days
    ),
    'topPages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'pageViews', page_views, 'uniqueVisitors', unique_visitors) order by page_views desc, path), '[]'::jsonb)
      from (
        select path, count(*) as page_views, count(distinct visitor_hash) as unique_visitors
        from website_page_views
        where created_at >= now() - interval '30 days'
        group by path
        order by page_views desc, path
        limit 10
      ) pages
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_website_analytics() from public;
grant execute on function public.admin_website_analytics() to authenticated;

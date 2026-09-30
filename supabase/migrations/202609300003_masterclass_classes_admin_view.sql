-- The table rename in 202609290002 kept the back-office view's old name
-- (freight_broker_classes_admin), so the sessions page could not load. A view's
-- c.* is also fixed when it is created, so rebuild it to include the attendance
-- columns added since.
drop view if exists public.freight_broker_classes_admin;
drop view if exists public.freight_dispatch_masterclass_classes_admin;

create view public.freight_dispatch_masterclass_classes_admin with (security_invoker = true) as
select
  c.*,
  coalesce(r.seats_taken, 0)::int as seats_taken,
  case when c.seat_capacity is null then null else greatest(c.seat_capacity - coalesce(r.seats_taken, 0), 0) end as seats_remaining
from public.freight_dispatch_masterclass_classes c
left join (
  select class_id, count(*) as seats_taken
  from public.freight_dispatch_masterclass_registrations
  where payment_status = 'paid' and status <> 'CANCELED'
  group by class_id
) r on r.class_id = c.id;

revoke all on public.freight_dispatch_masterclass_classes_admin from anon, authenticated;
grant select on public.freight_dispatch_masterclass_classes_admin to authenticated;

notify pgrst, 'reload schema';

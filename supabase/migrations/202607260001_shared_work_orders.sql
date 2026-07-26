create or replace function public.employee_update_work_order(
  order_id uuid,
  next_status text,
  next_notes jsonb,
  next_history jsonb,
  next_resolution_summary text
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.work_orders;
  updated_order public.work_orders;
begin
  select * into current_order
  from public.work_orders
  where id = order_id and assignee_id = auth.uid();

  if current_order.id is null then
    raise exception 'Work order not found or access denied';
  end if;

  if next_status not in ('Open', 'In progress', 'Blocked', 'Pending approval') then
    raise exception 'Employees cannot set this work-order status';
  end if;

  update public.work_orders
  set
    status = next_status,
    notes = coalesce(next_notes, notes),
    status_history = coalesce(next_history, status_history),
    resolution_summary = coalesce(next_resolution_summary, resolution_summary),
    started_at = case when next_status = 'In progress' then coalesce(started_at, now()) else started_at end,
    blocked_at = case when next_status = 'Blocked' then now() else blocked_at end,
    completion_submitted_at = case when next_status = 'Pending approval' then now() else completion_submitted_at end,
    updated_at = now()
  where id = order_id
  returning * into updated_order;

  return updated_order;
end;
$$;

revoke all on function public.employee_update_work_order(uuid, text, jsonb, jsonb, text) from public;
grant execute on function public.employee_update_work_order(uuid, text, jsonb, jsonb, text) to authenticated;

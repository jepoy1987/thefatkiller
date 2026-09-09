create function public.update_coach_goal(p_goal_id uuid, p_title text, p_description text, p_category public.coach_goal_category, p_target_date date, p_priority public.coach_goal_priority, p_client_visible boolean)
returns public.coach_goals language plpgsql security definer set search_path = '' as $$
declare saved public.coach_goals;
begin
  update public.coach_goals g set title=trim(p_title),description=nullif(trim(p_description),''),category=p_category,target_date=p_target_date,priority=p_priority,client_visible=p_client_visible
  where g.id=p_goal_id and g.coach_user_id=auth.uid() and g.status='active' and private.can_coach_client(g.client_user_id) returning * into saved;
  if saved.id is null then raise exception 'Active goal not found' using errcode='P0002'; end if;
  return saved;
end; $$;
revoke all on function public.update_coach_goal(uuid,text,text,public.coach_goal_category,date,public.coach_goal_priority,boolean) from public, anon;
grant execute on function public.update_coach_goal(uuid,text,text,public.coach_goal_category,date,public.coach_goal_priority,boolean) to authenticated;

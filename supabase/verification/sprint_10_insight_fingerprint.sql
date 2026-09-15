-- Read-only before/after comparison for rollback-only weekly insight QA.
select 'auth.users' as component, md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) as fingerprint from auth.users t
union all
select 'user_roles',md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id)::text,'')) from public.user_roles t
union all
select 'user_subscriptions',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.user_subscriptions t
union all
select 'coach_client_relationships',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.coach_client_relationships t
union all
select 'workout_assignments',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.workout_assignments t
union all
select 'workout_templates',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.workout_templates t
union all
select 'workout_template_items',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.workout_template_items t
union all
select 'workout_sessions',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.workout_sessions t
union all
select 'workout_session_exercises',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.workout_session_exercises t
union all
select 'workout_set_logs',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.workout_set_logs t
union all
select 'exercises',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.exercises t
union all
select 'training_programs',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.training_programs t
union all
select 'training_program_workouts',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.training_program_workouts t
union all
select 'weekly_insights',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.weekly_insights t;

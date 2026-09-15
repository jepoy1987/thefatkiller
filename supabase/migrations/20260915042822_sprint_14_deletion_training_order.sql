-- RESTRICT training FKs are intentionally retained for ordinary mutations.
-- Explicit account deletion removes owned dependencies in the safe order.
create function public.prepare_account_deletion(p_user_id uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from private.account_deletions where user_id=p_user_id and lease=p_lease and lease_until>clock_timestamp() for update;
 if not found or not public.account_deletion_ready(p_user_id,p_lease) then return false; end if;
 delete from public.workout_assignments where coach_user_id=p_user_id or client_user_id=p_user_id;
 delete from public.training_programs where owner_user_id=p_user_id;
 delete from public.workout_templates where owner_user_id=p_user_id;
 -- Session/exercise snapshots belonging to other users retain their snapshots;
 -- their existing SET NULL foreign keys detach from the deleted definitions.
 return true;
end; $$;
revoke all on function public.prepare_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_account_deletion(uuid,uuid) to service_role;

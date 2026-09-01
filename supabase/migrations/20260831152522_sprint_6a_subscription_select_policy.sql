drop policy "user_subscriptions_select_own" on public.user_subscriptions;
drop policy "user_subscriptions_select_admin" on public.user_subscriptions;

create policy "user_subscriptions_select_owner_or_admin" on public.user_subscriptions for select to authenticated
using ((select auth.uid()) = user_id or (select private.current_user_is_admin()));

-- Explicit opt-in only; never run as a migration. Run after endpoint deployment and
-- owner approval for this environment. Secrets provisioned separately in Vault:
-- food_photo_cleanup_url: exact HTTPS cleanup endpoint (local Docker HTTP allowed)
-- food_photo_cleanup_secret: same >=32-character secret as server-only env config.
-- Neither the service-role key nor bearer value appears in cron.job command text.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.decrypted_secrets where name='food_photo_cleanup_url')
 or not exists(select 1 from vault.decrypted_secrets where name='food_photo_cleanup_secret' and length(decrypted_secret)>=32)
 then raise exception 'Cleanup Vault configuration missing';end if;
end $$;
select cron.schedule('tfk-food-photo-cleanup','* * * * *',$job$
 select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='food_photo_cleanup_url'),
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='food_photo_cleanup_secret')),
 body:='{}'::jsonb,timeout_milliseconds:=55000);
$job$);

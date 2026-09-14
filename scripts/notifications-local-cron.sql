-- LOCAL ONLY. Run through docker exec against supabase_db_tfk after the local
-- notification suite passes. Do not include this file in migrations or CI deploys.
-- SQL-native scheduling requires no HTTP credentials. Migration never activates it.
create extension if not exists pg_cron;
select cron.schedule('tfk-local-reminders','*/15 * * * *','select public.generate_due_notifications();');

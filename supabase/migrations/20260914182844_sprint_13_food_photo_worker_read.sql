-- Hosted projects may not grant service_role table privileges by default.
-- The trusted pre-claim cleanup reads analyses; writes remain fenced RPC operations.
grant select on table public.food_photo_analyses to service_role;

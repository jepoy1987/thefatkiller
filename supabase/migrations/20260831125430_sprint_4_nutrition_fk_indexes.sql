create index food_logs_food_id_idx on public.food_logs (food_id) where food_id is not null;
create index saved_meal_items_food_id_idx on public.saved_meal_items (food_id) where food_id is not null;

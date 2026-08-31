revoke insert, update on public.user_goals from authenticated;

grant insert (
  user_id, goal_type, starting_weight, goal_weight, height, activity_level,
  daily_calorie_target, daily_protein_target, daily_carbs_target,
  daily_fat_target, daily_water_target, daily_step_target, is_active
) on public.user_goals to authenticated;

grant update (
  goal_type, starting_weight, goal_weight, height, activity_level,
  daily_calorie_target, daily_protein_target, daily_carbs_target,
  daily_fat_target, daily_water_target, daily_step_target, is_active
) on public.user_goals to authenticated;

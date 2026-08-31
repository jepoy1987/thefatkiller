import type { UserGoal } from '@tfk/types';
import type { GoalSettingsInput, OnboardingInput } from '@tfk/validation';
import { heightToCentimeters, waterToMilliliters, weightToKilograms } from '@tfk/validation';
import type { WebSupabaseClient } from './client';

export async function getActiveGoal(supabase: WebSupabaseClient): Promise<UserGoal | null> {
  const { data, error } = await supabase.from('user_goals').select('*').eq('is_active', true).maybeSingle();
  if (error) throw new Error('Your active goal could not be loaded.');
  return data as UserGoal | null;
}

export async function saveOnboarding(supabase: WebSupabaseClient, input: OnboardingInput) {
  return supabase.rpc('complete_onboarding', {
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_display_name: input.display_name,
    p_date_of_birth: input.date_of_birth,
    p_unit_system: input.unit_system,
    p_goal_type: input.goal_type,
    p_starting_weight: weightToKilograms(input.starting_weight, input.unit_system),
    p_goal_weight: weightToKilograms(input.goal_weight, input.unit_system),
    p_height: heightToCentimeters(input.height, input.unit_system),
    p_activity_level: input.activity_level,
    p_daily_calorie_target: input.daily_calorie_target,
    p_daily_protein_target: input.daily_protein_target,
    p_daily_carbs_target: input.daily_carbs_target,
    p_daily_fat_target: input.daily_fat_target,
    p_daily_water_target: waterToMilliliters(input.daily_water_target, input.unit_system),
    p_daily_step_target: input.daily_step_target,
  });
}

export async function saveGoalSettings(supabase: WebSupabaseClient, input: GoalSettingsInput) {
  return supabase.rpc('update_goal_settings', {
    p_unit_system: input.unit_system,
    p_goal_type: input.goal_type,
    p_goal_weight: weightToKilograms(input.goal_weight, input.unit_system),
    p_activity_level: input.activity_level,
    p_daily_calorie_target: input.daily_calorie_target,
    p_daily_protein_target: input.daily_protein_target,
    p_daily_carbs_target: input.daily_carbs_target,
    p_daily_fat_target: input.daily_fat_target,
    p_daily_water_target: waterToMilliliters(input.daily_water_target, input.unit_system),
    p_daily_step_target: input.daily_step_target,
  });
}

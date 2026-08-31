'use server';

import { goalSettingsSchema } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { saveGoalSettings } from '../../lib/data/goals';
import { requireUser } from '../../lib/data/session';
import { formValue, redirectWithError } from './form';

export async function updateGoalSettings(data: FormData) {
  const parsed = goalSettingsSchema.safeParse({
    unit_system: formValue(data, 'unit_system'), goal_type: formValue(data, 'goal_type'),
    goal_weight: formValue(data, 'goal_weight'), activity_level: formValue(data, 'activity_level'),
    daily_calorie_target: formValue(data, 'daily_calorie_target'),
    daily_protein_target: formValue(data, 'daily_protein_target'),
    daily_carbs_target: formValue(data, 'daily_carbs_target'),
    daily_fat_target: formValue(data, 'daily_fat_target'),
    daily_water_target: formValue(data, 'daily_water_target'),
    daily_step_target: formValue(data, 'daily_step_target'),
  });
  if (!parsed.success) return redirectWithError('/settings/goals', parsed.error.issues[0]?.message ?? 'Invalid goal settings');
  const supabase = createClient();
  await requireUser(supabase);
  const { error } = await saveGoalSettings(supabase, parsed.data);
  if (error) redirectWithError('/settings/goals', error.message);
  redirect('/settings/goals?message=Goals saved.');
}

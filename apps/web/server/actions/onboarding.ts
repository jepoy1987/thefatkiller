'use server';

import { onboardingSchema } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { saveOnboarding } from '../../lib/data/goals';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
import { formValue, redirectWithError } from './form';

export async function completeOnboarding(data: FormData) {
  const parsed = onboardingSchema.safeParse({
    first_name: formValue(data, 'first_name'), last_name: formValue(data, 'last_name'),
    display_name: formValue(data, 'display_name'), date_of_birth: formValue(data, 'date_of_birth'),
    unit_system: formValue(data, 'unit_system'), goal_type: formValue(data, 'goal_type'),
    starting_weight: formValue(data, 'starting_weight'), goal_weight: formValue(data, 'goal_weight'),
    height: formValue(data, 'height'), activity_level: formValue(data, 'activity_level'),
    daily_calorie_target: formValue(data, 'daily_calorie_target'),
    daily_protein_target: formValue(data, 'daily_protein_target'),
    daily_carbs_target: formValue(data, 'daily_carbs_target'),
    daily_fat_target: formValue(data, 'daily_fat_target'),
    daily_water_target: formValue(data, 'daily_water_target'),
    daily_step_target: formValue(data, 'daily_step_target'),
  });
  if (!parsed.success) return redirectWithError('/onboarding', parsed.error.issues[0]?.message ?? 'Invalid profile');
  const supabase = createClient();
  await requireUser(supabase);
  const { error } = await saveOnboarding(supabase, parsed.data);
  if (error) redirectWithError('/onboarding', error.message);
  redirect('/dashboard');
}

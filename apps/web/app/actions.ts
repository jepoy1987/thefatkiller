'use server';

import { redirect } from 'next/navigation';
import {
  goalSettingsSchema, heightToCentimeters, loginSchema, onboardingSchema,
  profileSchema, signupSchema, waterToMilliliters, weightToKilograms,
} from '@tfk/validation';
import { createClient } from '../lib/supabase/server';

const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const fail = (path: string, message: string): never => redirect(`${path}?error=${encodeURIComponent(message)}`);

export async function login(data: FormData) {
  const parsed = loginSchema.safeParse({ email: value(data, 'email'), password: value(data, 'password') });
  if (!parsed.success) return fail('/login', parsed.error.issues[0]?.message ?? 'Invalid login');
  const { error } = await createClient().auth.signInWithPassword(parsed.data);
  if (error) fail('/login', error.message);
  redirect('/dashboard');
}

export async function signup(data: FormData) {
  const parsed = signupSchema.safeParse({ email: value(data, 'email'), password: value(data, 'password') });
  if (!parsed.success) return fail('/signup', parsed.error.issues[0]?.message ?? 'Invalid signup');
  const { error } = await createClient().auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/auth/callback` } });
  if (error) fail('/signup', error.message);
  redirect('/login?message=Check your email to confirm your account.');
}

export async function forgotPassword(data: FormData) {
  const email = value(data, 'email');
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/auth/callback?next=/settings/profile` });
  if (error) fail('/forgot-password', error.message);
  redirect('/forgot-password?message=If the account exists, a reset link has been sent.');
}

export async function completeOnboarding(data: FormData) {
  const parsed = onboardingSchema.safeParse({
    first_name: value(data, 'first_name'), last_name: value(data, 'last_name'),
    display_name: value(data, 'display_name'), date_of_birth: value(data, 'date_of_birth'),
    unit_system: value(data, 'unit_system'), goal_type: value(data, 'goal_type'),
    starting_weight: value(data, 'starting_weight'), goal_weight: value(data, 'goal_weight'),
    height: value(data, 'height'), activity_level: value(data, 'activity_level'),
    daily_calorie_target: value(data, 'daily_calorie_target'),
    daily_protein_target: value(data, 'daily_protein_target'),
    daily_carbs_target: value(data, 'daily_carbs_target'), daily_fat_target: value(data, 'daily_fat_target'),
    daily_water_target: value(data, 'daily_water_target'), daily_step_target: value(data, 'daily_step_target'),
  });
  if (!parsed.success) return fail('/onboarding', parsed.error.issues[0]?.message ?? 'Invalid profile');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const input = parsed.data;
  const { error } = await supabase.rpc('complete_onboarding', {
    p_first_name: input.first_name, p_last_name: input.last_name,
    p_display_name: input.display_name, p_date_of_birth: input.date_of_birth,
    p_unit_system: input.unit_system, p_goal_type: input.goal_type,
    p_starting_weight: weightToKilograms(input.starting_weight, input.unit_system),
    p_goal_weight: weightToKilograms(input.goal_weight, input.unit_system),
    p_height: heightToCentimeters(input.height, input.unit_system),
    p_activity_level: input.activity_level, p_daily_calorie_target: input.daily_calorie_target,
    p_daily_protein_target: input.daily_protein_target, p_daily_carbs_target: input.daily_carbs_target,
    p_daily_fat_target: input.daily_fat_target,
    p_daily_water_target: waterToMilliliters(input.daily_water_target, input.unit_system),
    p_daily_step_target: input.daily_step_target,
  });
  if (error) fail('/onboarding', error.message);
  redirect('/dashboard');
}

export async function updateGoalSettings(data: FormData) {
  const parsed = goalSettingsSchema.safeParse({
    unit_system: value(data, 'unit_system'), goal_type: value(data, 'goal_type'),
    goal_weight: value(data, 'goal_weight'), activity_level: value(data, 'activity_level'),
    daily_calorie_target: value(data, 'daily_calorie_target'), daily_protein_target: value(data, 'daily_protein_target'),
    daily_carbs_target: value(data, 'daily_carbs_target'), daily_fat_target: value(data, 'daily_fat_target'),
    daily_water_target: value(data, 'daily_water_target'), daily_step_target: value(data, 'daily_step_target'),
  });
  if (!parsed.success) return fail('/settings/goals', parsed.error.issues[0]?.message ?? 'Invalid goal settings');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const input = parsed.data;
  const { error } = await supabase.rpc('update_goal_settings', {
    p_unit_system: input.unit_system, p_goal_type: input.goal_type,
    p_goal_weight: weightToKilograms(input.goal_weight, input.unit_system),
    p_activity_level: input.activity_level, p_daily_calorie_target: input.daily_calorie_target,
    p_daily_protein_target: input.daily_protein_target, p_daily_carbs_target: input.daily_carbs_target,
    p_daily_fat_target: input.daily_fat_target,
    p_daily_water_target: waterToMilliliters(input.daily_water_target, input.unit_system),
    p_daily_step_target: input.daily_step_target,
  });
  if (error) fail('/settings/goals', error.message);
  redirect('/settings/goals?message=Goals saved.');
}

export async function updateProfile(data: FormData) {
  const parsed = profileSchema.safeParse({ first_name: value(data, 'first_name'), last_name: value(data, 'last_name'), display_name: value(data, 'display_name'), date_of_birth: value(data, 'date_of_birth') || null, unit_system: value(data, 'unit_system') });
  if (!parsed.success) return fail('/settings/profile', parsed.error.issues[0]?.message ?? 'Invalid profile');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id);
  if (error) fail('/settings/profile', error.message);
  redirect('/settings/profile?message=Profile saved.');
}

export async function logout() {
  await createClient().auth.signOut();
  redirect('/login');
}

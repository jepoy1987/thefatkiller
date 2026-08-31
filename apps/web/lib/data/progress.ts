import { calculateProgress } from '@tfk/api';
import type { BodyMeasurement, Milestone, ProgressPhoto, WeightEntry } from '@tfk/types';
import { redirect } from 'next/navigation';
import { getActiveGoal } from './goals';
import { getProfile } from './profile';
import { requireUser } from './session';
import type { WebSupabaseClient } from './client';
import { createClient } from './client';

export async function getLatestWeight(supabase: WebSupabaseClient): Promise<number | undefined> {
  const { data, error } = await supabase.from('weight_entries').select('weight_kg').order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('Your latest weight could not be loaded.');
  return data?.weight_kg;
}

export async function getProgressFoundation() {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const [profile, goal, weightsResult, measurementsResult, photosResult, milestonesResult] = await Promise.all([
    getProfile(supabase, user.id), getActiveGoal(supabase),
    supabase.from('weight_entries').select('*').order('recorded_at', { ascending: false }),
    supabase.from('body_measurements').select('*').order('recorded_at', { ascending: false }),
    supabase.from('progress_photos').select('*').order('recorded_at', { ascending: false }),
    supabase.from('milestones').select('*').order('achieved_at', { ascending: false }),
  ]);
  if (!profile.onboarding_completed || !goal) redirect('/onboarding');
  const failed = [weightsResult, measurementsResult, photosResult, milestonesResult].find((result) => result.error);
  if (failed?.error) throw new Error('Progress data could not be loaded.');
  const weights = (weightsResult.data ?? []) as WeightEntry[];
  const photos = await Promise.all(((photosResult.data ?? []) as ProgressPhoto[]).map(async (photo) => {
    const { data } = await supabase.storage.from('progress-photos').createSignedUrl(photo.storage_path, 3600);
    return { ...photo, signed_url: data?.signedUrl };
  }));
  return { profile, goal, weights, measurements: (measurementsResult.data ?? []) as BodyMeasurement[], photos, milestones: (milestonesResult.data ?? []) as Milestone[], summary: calculateProgress(profile, goal, weights) };
}

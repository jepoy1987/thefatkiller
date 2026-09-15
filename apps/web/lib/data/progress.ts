import { calculateProgress } from '@tfk/api';
import type { BodyMeasurement, Milestone, ProgressPhoto, WeightEntry } from '@tfk/types';
import { redirect } from 'next/navigation';
import { getActiveGoal } from './goals';
import { getProfile } from './profile';
import { requireUser } from './session';
import type { WebSupabaseClient } from './client';
import { createClient } from './client';
import { logDataFailure } from '../../server/observability';

export async function getLatestWeight(supabase: WebSupabaseClient): Promise<number | undefined> {
  const { data, error } = await supabase.from('weight_entries').select('weight_kg').order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  if (error) { logDataFailure('latest_weight', error.code); throw new Error('Your latest weight could not be loaded.'); }
  return data?.weight_kg;
}

export async function getProgressFoundation(page = 1) {
  const offset = (page - 1) * 20;
  const supabase = (await createClient());
  const user = await requireUser(supabase);
  const [profile, goal, weightsResult, measurementsResult, photosResult, milestonesResult, earliestResult, latestResult] = await Promise.all([
    getProfile(supabase, user.id), getActiveGoal(supabase),
    supabase.from('weight_entries').select('*').order('recorded_at', { ascending: false }).order('id').range(offset, offset + 20),
    supabase.from('body_measurements').select('*').order('recorded_at', { ascending: false }).order('id').range(offset, offset + 20),
    supabase.from('progress_photos').select('*').order('recorded_at', { ascending: false }).order('id').range(offset, offset + 20),
    supabase.from('milestones').select('*').order('achieved_at', { ascending: false }).limit(100),
    supabase.from('weight_entries').select('*').order('recorded_at').order('id').limit(1),
    supabase.from('weight_entries').select('*').order('recorded_at', { ascending: false }).order('id').limit(12),
  ]);
  if (!profile.onboarding_completed || !goal) redirect('/onboarding');
  const failed = [weightsResult, measurementsResult, photosResult, milestonesResult, earliestResult, latestResult].find((result) => result.error);
  if (failed?.error) throw new Error('Progress data could not be loaded.');
  const weights = (weightsResult.data ?? []).slice(0,20) as WeightEntry[];
  const chartWeights = (latestResult.data ?? []) as WeightEntry[];
  const summaryWeights = [...(earliestResult.data ?? []), ...chartWeights] as WeightEntry[];
  const photoRows = (photosResult.data ?? []).slice(0,20) as ProgressPhoto[];
  const signed = photoRows.length ? await supabase.storage.from('progress-photos').createSignedUrls(photoRows.map(p => p.storage_path), 3600) : { data: [] };
  const photos = photoRows.map(photo => ({ ...photo, signed_url: signed.data?.find(s => s.path === photo.storage_path)?.signedUrl }));
  return { profile, goal, weights, chartWeights, page, hasMore: [weightsResult, measurementsResult, photosResult].some(r => (r.data?.length ?? 0) > 20), measurements: (measurementsResult.data ?? []).slice(0,20) as BodyMeasurement[], photos, milestones: (milestonesResult.data ?? []) as Milestone[], summary: calculateProgress(profile, goal, summaryWeights) };
}

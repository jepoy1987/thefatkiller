import { hasFeature } from '@tfk/access';
import type { GLP1DoseLog, GLP1MedicationProfile, GLP1SymptomLog } from '@tfk/types';
import { redirect } from 'next/navigation';
import { createClient, type WebSupabaseClient } from './client';
import { getCurrentEntitlements } from './entitlements';
import { getProfile } from './profile';
import { requireUser } from './session';

export async function requireGLP1Access(supabase: WebSupabaseClient) {
  const user = await requireUser(supabase);
  const entitlements = await getCurrentEntitlements(supabase);
  if (!hasFeature(entitlements, 'glp1_journal')) return { user, entitlements, allowed: false as const };
  return { user, entitlements, allowed: true as const };
}

async function activeProfile(supabase: WebSupabaseClient) {
  const { data, error } = await supabase.from('glp1_medication_profiles').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('Your medication journal profile could not be loaded.');
  return data as GLP1MedicationProfile | null;
}

async function doseLogs(supabase: WebSupabaseClient, limit = 50) {
  const { data, error } = await supabase.from('glp1_dose_logs').select('*').order('taken_at', { ascending: false }).limit(limit);
  if (error) throw new Error('Medication history could not be loaded.');
  return (data ?? []) as GLP1DoseLog[];
}

async function symptomLogs(supabase: WebSupabaseClient, limit = 50) {
  const { data, error } = await supabase.from('glp1_symptom_logs').select('*').order('logged_at', { ascending: false }).limit(limit);
  if (error) throw new Error('Symptom history could not be loaded.');
  return (data ?? []) as GLP1SymptomLog[];
}

export async function getActiveMedicationProfile() {
  const supabase = createClient(); const access = await requireGLP1Access(supabase);
  if (!access.allowed) redirect('/settings/billing');
  return activeProfile(supabase);
}

export async function getDoseLogs(limit = 50) {
  const supabase = createClient(); const access = await requireGLP1Access(supabase);
  if (!access.allowed) redirect('/settings/billing');
  return doseLogs(supabase, limit);
}

export async function getSymptomLogs(limit = 50) {
  const supabase = createClient(); const access = await requireGLP1Access(supabase);
  if (!access.allowed) redirect('/settings/billing');
  return symptomLogs(supabase, limit);
}

export async function getGLP1Foundation() {
  const supabase = createClient(); const access = await requireGLP1Access(supabase);
  if (!access.allowed) return { ...access, profile: null, medicationProfile: null, doseLogs: [], symptomLogs: [] };
  const [profile, medicationProfile, doses, symptoms] = await Promise.all([
    getProfile(supabase, access.user.id), activeProfile(supabase), doseLogs(supabase), symptomLogs(supabase),
  ]);
  if (!profile.onboarding_completed) redirect('/onboarding');
  return { ...access, profile, medicationProfile, doseLogs: doses, symptomLogs: symptoms };
}

export async function getGLP1TodaySummary(supabase: WebSupabaseClient) {
  const entitlements = await getCurrentEntitlements(supabase);
  if (!hasFeature(entitlements, 'glp1_journal')) return null;
  const medicationProfile = await activeProfile(supabase);
  if (!medicationProfile) return null;
  const [doses, symptoms] = await Promise.all([doseLogs(supabase, 1), symptomLogs(supabase, 1)]);
  return { medicationProfile, lastDose: doses[0] ?? null, latestSymptom: symptoms[0] ?? null };
}

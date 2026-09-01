'use server';

import { zonedDateTimeToIso } from '@tfk/api';
import { glp1DoseLogSchema, glp1MedicationProfileSchema, glp1SymptomLogSchema } from '@tfk/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { requireGLP1Access } from '../../lib/data/glp1';
import { formValue, redirectWithError } from './form';

const path = '/glp1';
const fail = (message: string): never => redirectWithError(path, message);
const finish = (message: string) => { revalidatePath(path); revalidatePath('/dashboard'); redirect(`${path}?message=${encodeURIComponent(message)}`); };
const nullable = (value: unknown) => value === '' || value == null ? null : value;

async function context() {
  const supabase = createClient(); const access = await requireGLP1Access(supabase);
  if (!access.allowed) fail('GLP-1 Journal is not included in your current plan.');
  return { supabase, user: access.user };
}

export async function saveMedicationProfile(data: FormData) {
  const parsed = glp1MedicationProfileSchema.safeParse(Object.fromEntries(['id','medication_name','custom_medication_name','started_on','prescribed_schedule','usual_day_of_week','usual_time','notes'].map((key) => [key, formValue(data, key)])));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? 'Invalid medication profile.');
  const input = parsed.data!; const { supabase, user } = await context();
  const values = { medication_name: input.medication_name, custom_medication_name: input.medication_name === 'other' ? input.custom_medication_name || null : null, is_active: true, started_on: nullable(input.started_on), prescribed_schedule: nullable(input.prescribed_schedule), usual_day_of_week: input.prescribed_schedule === 'weekly' ? nullable(input.usual_day_of_week) : null, usual_time: nullable(input.usual_time), notes: input.notes || null };
  const result = input.id ? await supabase.from('glp1_medication_profiles').update(values).eq('id', input.id) : await supabase.from('glp1_medication_profiles').insert({ user_id: user.id, ...values });
  if (result.error) fail('Medication profile could not be saved.');
  finish('Medication profile saved.');
}

export async function saveDoseLog(data: FormData) {
  const parsed = glp1DoseLogSchema.safeParse(Object.fromEntries(['id','medication_profile_id','event_type','dose_amount','dose_unit','taken_at','injection_site','notes'].map((key) => [key, formValue(data, key)])));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? 'Invalid medication entry.');
  const input = parsed.data!; const { supabase, user } = await context(); const taken = input.event_type === 'taken';
  const values = { medication_profile_id: input.medication_profile_id, event_type: input.event_type, dose_amount: taken ? Number(input.dose_amount) : null, dose_unit: taken ? input.dose_unit || null : null, taken_at: zonedDateTimeToIso(input.taken_at, formValue(data, 'timezone') || 'UTC'), injection_site: taken ? input.injection_site || null : null, notes: input.notes || null };
  const result = input.id ? await supabase.from('glp1_dose_logs').update(values).eq('id', input.id) : await supabase.from('glp1_dose_logs').insert({ user_id: user.id, ...values });
  if (result.error) fail('Medication entry could not be saved.');
  finish(input.id ? 'Medication entry updated.' : 'Medication entry saved.');
}

export async function deleteDoseLog(data: FormData) {
  const { supabase } = await context(); const { error } = await supabase.from('glp1_dose_logs').delete().eq('id', formValue(data, 'id'));
  if (error) fail('Medication entry could not be deleted.'); finish('Medication entry deleted.');
}

export async function saveSymptomLog(data: FormData) {
  const keys = ['medication_profile_id','dose_log_id','logged_at','appetite','hunger','nausea','constipation','diarrhea','reflux','fatigue','headache','abdominal_discomfort','other_symptoms','notes'];
  const parsed = glp1SymptomLogSchema.safeParse(Object.fromEntries(keys.map((key) => [key, formValue(data, key)])));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? 'Invalid symptom entry.');
  const input = parsed.data!; const { supabase, user } = await context();
  const rating = (value: string | number | undefined) => value === '' || value == null ? null : Number(value);
  const { error } = await supabase.from('glp1_symptom_logs').insert({ user_id: user.id, medication_profile_id: input.medication_profile_id || null, dose_log_id: input.dose_log_id || null, logged_at: zonedDateTimeToIso(input.logged_at, formValue(data, 'timezone') || 'UTC'), appetite: rating(input.appetite), hunger: rating(input.hunger), nausea: rating(input.nausea), constipation: rating(input.constipation), diarrhea: rating(input.diarrhea), reflux: rating(input.reflux), fatigue: rating(input.fatigue), headache: rating(input.headache), abdominal_discomfort: rating(input.abdominal_discomfort), other_symptoms: input.other_symptoms || null, notes: input.notes || null });
  if (error) fail('Symptom entry could not be saved.'); finish('Symptom entry saved.');
}

export async function deleteSymptomLog(data: FormData) {
  const { supabase } = await context(); const { error } = await supabase.from('glp1_symptom_logs').delete().eq('id', formValue(data, 'id'));
  if (error) fail('Symptom entry could not be deleted.'); finish('Entry deleted.');
}

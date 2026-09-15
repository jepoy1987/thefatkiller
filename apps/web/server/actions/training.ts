'use server';

import { trainingDistanceToMeters } from '@tfk/api';
import { exerciseSchema, trainingProgramSchema, weightToKilograms, workoutAssignmentSchema, workoutSetSchema, workoutTemplateSchema } from '@tfk/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '../../lib/data/client';
import { getProfile } from '../../lib/data/profile';
import { requireTrainingAccess } from '../../lib/data/training';

export type TrainingActionState = { error?: string; message?: string; id?: string };
const idSchema = z.object({ id: z.string().uuid() }).strict();
const startSchema = z.union([z.object({ workout_template_id: z.string().uuid() }).strict(), z.object({ assignment_id: z.string().uuid() }).strict()]);
const statusSchema = z.object({ id: z.string().uuid(), status: z.enum(['assigned', 'skipped', 'archived']) }).strict();
const deleteSetSchema = z.object({ session_exercise_id: z.string().uuid(), set_number: z.coerce.number().int().min(1).max(100) }).strict();
const notesSchema = z.object({ id: z.string().uuid(), notes: z.string().trim().max(2000) }).strict();

async function command(operation: string, form: FormData, schema: z.ZodTypeAny): Promise<TrainingActionState> {
  const supabase = (await createClient()); const access = await requireTrainingAccess(supabase);
  if (!access.allowed) return { error: 'Training is not included in your current plan.' };
  let input: Record<string, unknown>;
  try {
    input = form.has('payload') ? JSON.parse(String(form.get('payload'))) : Object.fromEntries(Array.from(form.entries()).filter(([key]) => !key.startsWith('$ACTION_') && key !== 'request_key'));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
    if (operation === 'save_set' || operation === 'save_template') {
      const profile = await getProfile(supabase, access.user.id);
      const convert = (value: unknown, kind: 'weight' | 'distance') => value === '' || value == null ? null : kind === 'weight' ? weightToKilograms(Number(value), profile.unit_system) : trainingDistanceToMeters(Number(value), profile.unit_system);
      if (operation === 'save_set') {
        input.weight_kg = convert(input.weight_kg, 'weight'); input.distance_meters = convert(input.distance_meters, 'distance');
        input.completed = input.completed === true || input.completed === 'on';
      } else if (Array.isArray(input.items)) {
        input.items = input.items.map(item => ({ ...item, target_distance_meters: convert(item.target_distance_meters, 'distance') }));
      }
    }
  } catch { return { error: 'The entry could not be read. Please check your fields.' }; }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check your fields.' };
  const { data, error } = await (operation === 'start' || operation === 'complete' ? supabase.rpc('replay_safe_mutation', { p_key: String(form.get('request_key') ?? ''), p_operation: `training_${operation}`, p_input: parsed.data }) : supabase.rpc('training_mutate', { operation, payload: parsed.data }));
  if (error) {
    if (error.code === '23503') return { error: 'This item is used by a workout, program, or assignment. Archive the workout to retain its history.' };
    if (error.code === '42501') return { error: 'You no longer have access to this item or active coach relationship.' };
    if (error.code === '22023') return { error: error.message };
    return { error: 'The change could not be saved. Your entered values are retained; please try again.' };
  }
  revalidatePath('/training', 'layout'); revalidatePath('/dashboard'); revalidatePath('/coach', 'layout');
  return { id: (data as { id?: string })?.id, message: 'Saved.' };
}
export async function saveExercise(_: TrainingActionState, form: FormData) { return command('save_exercise', form, exerciseSchema); }
export async function deleteExercise(_: TrainingActionState, form: FormData) { return command('delete_exercise', form, idSchema); }
export async function saveWorkoutTemplate(_: TrainingActionState, form: FormData) { return command('save_template', form, workoutTemplateSchema); }
export async function archiveWorkoutTemplate(_: TrainingActionState, form: FormData) { return command('archive_template', form, idSchema); }
export async function deleteWorkoutTemplate(_: TrainingActionState, form: FormData) { return command('delete_template', form, idSchema); }
export async function saveTrainingProgram(_: TrainingActionState, form: FormData) { return command('save_program', form, trainingProgramSchema); }
export async function deleteTrainingProgram(_: TrainingActionState, form: FormData) { return command('delete_program', form, idSchema); }
export async function startWorkoutSession(_: TrainingActionState, form: FormData) {
  const result = await command('start', form, startSchema);
  if (result.id) redirect(`/training/sessions/${result.id}`);
  return result;
}
export async function saveWorkoutSet(_: TrainingActionState, form: FormData) { return command('save_set', form, workoutSetSchema); }
export async function deleteWorkoutSet(_: TrainingActionState, form: FormData) { return command('delete_set', form, deleteSetSchema); }
export async function completeWorkoutSession(_: TrainingActionState, form: FormData) { return command('complete', form, idSchema); }
export async function abandonWorkoutSession(_: TrainingActionState, form: FormData) { return command('abandon', form, idSchema); }
export async function saveSessionNotes(_: TrainingActionState, form: FormData) { return command('session_notes', form, notesSchema); }
export async function deleteWorkoutSession(_: TrainingActionState, form: FormData) {
  const result = await command('delete_session', form, idSchema);
  if (!result.error) redirect('/training');
  return result;
}
export async function assignWorkout(_: TrainingActionState, form: FormData) { return command('assign', form, workoutAssignmentSchema); }
export async function updateAssignmentStatus(_: TrainingActionState, form: FormData) { return command('assignment_status', form, statusSchema); }

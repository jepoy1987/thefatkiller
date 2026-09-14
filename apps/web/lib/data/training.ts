import { hasFeature } from '@tfk/access';
import type { Exercise, TrainingProgram, TrainingSummary, WorkoutAssignment, WorkoutSession, WorkoutSessionExercise, WorkoutSetLog, WorkoutTemplate } from '@tfk/types';
import { notFound, redirect } from 'next/navigation';
import { createClient, type WebSupabaseClient } from './client';
import { getCurrentEntitlements } from './entitlements';
import { getProfile } from './profile';
import { requireUser } from './session';

export async function requireTrainingAccess(supabase: WebSupabaseClient) {
  const user = await requireUser(supabase);
  const entitlements = await getCurrentEntitlements(supabase);
  return { user, allowed: hasFeature(entitlements, 'workouts') };
}
async function client() {
  const supabase = createClient(); const access = await requireTrainingAccess(supabase);
  if (!access.allowed) redirect('/training');
  return { supabase, user: access.user };
}
export async function getExerciseLibrary(filters: { q?: string; category?: string; equipment?: string } = {}) {
  const { supabase } = await client();
  let query = supabase.from('exercises').select('*').eq('is_active', true).order('name').limit(100);
  if (filters.q) query = query.ilike('name', `%${filters.q.slice(0, 120).replace(/[%_\\]/g, '\\$&')}%`);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.equipment) query = query.eq('equipment', filters.equipment);
  const { data, error } = await query;
  if (error) throw new Error('Exercise library could not be loaded.');
  return (data ?? []) as Exercise[];
}
export async function getWorkoutTemplates() {
  const { supabase, user } = await client();
  const { data, error } = await supabase.from('workout_templates').select('*').eq('owner_user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error('Workouts could not be loaded.');
  return (data ?? []) as WorkoutTemplate[];
}
export async function getWorkoutTemplate(id: string) {
  const { supabase, user } = await client();
  const { data, error } = await supabase.from('workout_templates').select('*,items:workout_template_items(*)').eq('id', id).eq('owner_user_id', user.id).single();
  if (error || !data) notFound();
  const template = data as WorkoutTemplate;
  template.items?.sort((a, b) => a.position - b.position);
  return template;
}
export async function getTrainingPrograms() {
  const { supabase, user } = await client();
  const { data, error } = await supabase.from('training_programs').select('*,workouts:training_program_workouts(*)').eq('owner_user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error('Programs could not be loaded.');
  return (data ?? []) as TrainingProgram[];
}
export async function getWorkoutAssignments() {
  const { supabase, user } = await client();
  const { data, error } = await supabase.from('workout_assignments').select('*,template:workout_templates(name)').eq('client_user_id', user.id).neq('status', 'archived').order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error('Assignments could not be loaded.');
  return (data ?? []) as unknown as WorkoutAssignment[];
}
export async function getWorkoutHistory() {
  const { supabase, user } = await client();
  const { data, error } = await supabase.from('workout_sessions').select('*,exercises:workout_session_exercises(count)').eq('user_id', user.id).order('started_at', { ascending: false }).limit(20);
  if (error) throw new Error('Workout history could not be loaded.');
  return (data ?? []).map(row => ({ ...row, exercise_count: row.exercises?.[0]?.count ?? 0 })) as WorkoutSession[];
}
export async function getWorkoutSessionDetail(sessionId: string) {
  const { supabase, user } = await client();
  const [{ data: session, error }, { data: exercises, error: exerciseError }, profile] = await Promise.all([
    supabase.from('workout_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single(),
    supabase.from('workout_session_exercises').select('*').eq('workout_session_id', sessionId).order('position').limit(30),
    getProfile(supabase, user.id),
  ]);
  if (error || !session) notFound();
  if (exerciseError) throw new Error('Session exercises could not be loaded.');
  // At most 30 exercises x 100 sets. Page in batches below the API row cap.
  const ids = (exercises ?? []).map(e => e.id as string);
  const sets: WorkoutSetLog[] = [];
  if (ids.length) for (let offset = 0; offset < 3000; offset += 500) {
    const result = await supabase.from('workout_set_logs').select('*').in('workout_session_exercise_id', ids).order('workout_session_exercise_id').order('set_number').range(offset, offset + 499);
    if (result.error) throw new Error('Saved sets could not be loaded.');
    sets.push(...(result.data ?? []) as WorkoutSetLog[]);
    if ((result.data?.length ?? 0) < 500) break;
  }
  return { session: session as WorkoutSession, exercises: (exercises ?? []) as WorkoutSessionExercise[], sets, profile };
}
export async function getTrainingTodaySummary(supabase: WebSupabaseClient) {
  const access = await requireTrainingAccess(supabase);
  if (!access.allowed) return null;
  const { data, error } = await supabase.rpc('get_training_summary');
  if (error) throw new Error('Training summary could not be loaded.');
  const summary = data as TrainingSummary;
  const assignments = await supabase.from('workout_assignments').select('*,template:workout_templates(name)').eq('client_user_id', access.user.id).eq('assigned_for', summary.today).neq('status', 'archived').order('created_at').limit(10);
  if (assignments.error) throw new Error('Today’s training could not be loaded.');
  return { summary, assignments: (assignments.data ?? []) as unknown as WorkoutAssignment[] };
}
export async function getTrainingFoundation(filters: { q?: string; category?: string; equipment?: string } = {}) {
  const supabase = createClient(); const access = await requireTrainingAccess(supabase);
  if (!access.allowed) return { ...access, data: null };
  const [profile, exercises, templates, assignments, history, today] = await Promise.all([
    getProfile(supabase, access.user.id), getExerciseLibrary(filters), getWorkoutTemplates(), getWorkoutAssignments(), getWorkoutHistory(), getTrainingTodaySummary(supabase),
  ]);
  if (!profile.onboarding_completed) redirect('/onboarding');
  return { ...access, data: { profile, exercises, templates, assignments, history, today: today! } };
}
export async function getCoachClientTrainingSummary(clientId: string) {
  const supabase = createClient(); const access = await requireTrainingAccess(supabase);
  if (!access.allowed) return null;
  const { data, error } = await supabase.rpc('get_coach_client_training_summary', { client_id: clientId });
  if (error?.code === '42501') return null;
  if (error) throw new Error('Client training summary could not be loaded.');
  const [templates, assignments] = await Promise.all([
    getWorkoutTemplates(),
    supabase.from('workout_assignments').select('*,template:workout_templates(name)').eq('client_user_id', clientId).eq('coach_user_id', access.user.id).in('status', ['assigned', 'in_progress']).order('created_at', { ascending: false }).limit(20),
  ]);
  if (assignments.error) throw new Error('Client assignments could not be loaded.');
  return { summary: data as TrainingSummary, templates, assignments: (assignments.data ?? []) as unknown as WorkoutAssignment[] };
}

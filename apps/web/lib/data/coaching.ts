import type { AppRole, CoachClientRelationship, CoachClientSummary, CoachGoal, CoachNote, CoachingPrivacySettings } from '@tfk/types';
import { notFound, redirect } from 'next/navigation';
import { createClient, type WebSupabaseClient } from './client';
import { requireUser } from './session';

type ClientCoachingSummary = { relationship:CoachClientRelationship; coach_name:string; active_goal_count:number; next_target_date:string|null };

export async function getCoachingNavigation(supabase:WebSupabaseClient) {
  const [{data:role},{data:client}] = await Promise.all([
    supabase.rpc('get_current_app_role'), supabase.rpc('get_client_coaching_summary'),
  ]);
  return { role:role as AppRole|null, hasClientRelationship:Boolean(client), canCoach:role==='admin'||role==='coach' };
}

export async function getCoachDashboard() {
  const supabase=createClient(); await requireUser(supabase);
  const {data,error}=await supabase.rpc('get_coach_dashboard');
  if(error) redirect('/dashboard?error=Coach%20access%20is%20not%20available.');
  return (data??[]) as CoachClientSummary[];
}

export async function getCoachClientDetail(clientId:string) {
  const supabase=createClient(); await requireUser(supabase);
  const [{data:summary,error},{data:goals},{data:notes}] = await Promise.all([
    supabase.rpc('get_coach_client_summary',{client_id:clientId}),
    supabase.from('coach_goals').select('*').eq('client_user_id',clientId).order('created_at',{ascending:false}),
    supabase.from('coach_notes').select('*').eq('client_user_id',clientId).order('created_at',{ascending:false}),
  ]);
  if(error||!summary) notFound();
  return { summary:summary as unknown as CoachClientSummary, goals:(goals??[]) as CoachGoal[], notes:(notes??[]) as CoachNote[] };
}

export async function getClientCoachingFoundation() {
  const supabase=createClient(); const user=await requireUser(supabase);
  const {data:summary}=await supabase.rpc('get_client_coaching_summary');
  if(!summary) return {summary:null,goals:[] as CoachGoal[],notes:[] as CoachNote[],privacy:null};
  const [{data:goals},{data:notes},{data:privacy}] = await Promise.all([
    supabase.from('coach_goals').select('*').eq('client_user_id',user.id).eq('client_visible',true).order('target_date'),
    supabase.from('coach_notes').select('*').eq('client_user_id',user.id).eq('client_visible',true).order('created_at',{ascending:false}),
    supabase.from('coaching_privacy_settings').select('*').eq('user_id',user.id).maybeSingle(),
  ]);
  return {summary:summary as unknown as ClientCoachingSummary,goals:(goals??[]) as CoachGoal[],notes:(notes??[]) as CoachNote[],privacy:privacy as CoachingPrivacySettings|null};
}

export async function getTodayCoaching(supabase:WebSupabaseClient) {
  const {data}=await supabase.rpc('get_client_coaching_summary');
  return data as unknown as ClientCoachingSummary|null;
}

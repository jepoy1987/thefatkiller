import { hasFeature } from '@tfk/access';
import type { WeeklyInsight } from '@tfk/types';
import { notFound } from 'next/navigation';
import { createClient, type WebSupabaseClient } from './client';
import { requireUser } from './session';
import { getCurrentEntitlements } from './entitlements';
import { buildWeeklyInsightInput } from '../../features/insights/domain';
export async function requireInsightAccess(supabase:WebSupabaseClient) {
 const user=await requireUser(supabase);const entitlements=await getCurrentEntitlements(supabase);
 return {user,allowed:hasFeature(entitlements,'ai_insights')};
}
export async function getInsightFoundation(){
 const supabase=createClient();const access=await requireInsightAccess(supabase);
 if(!access.allowed)return {...access,input:null,history:[] as WeeklyInsight[]};
 const [source,history]=await Promise.all([
  supabase.rpc('get_weekly_insight_source'),
  supabase.from('weekly_insights').select('*').eq('user_id',access.user.id).order('period_end',{ascending:false}).limit(10),
 ]);
 if(source.error||history.error)throw new Error('Weekly insights could not be loaded.');
 return {...access,input:buildWeeklyInsightInput(source.data),history:(history.data??[]) as unknown as WeeklyInsight[]};
}
export async function getInsightDetail(id:string){
 const supabase=createClient();const access=await requireInsightAccess(supabase);
 if(!access.allowed||!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {data,error}=await supabase.from('weekly_insights').select('*').eq('user_id',access.user.id).eq('id',id).maybeSingle();
 if(error||!data)notFound();
 return data as unknown as WeeklyInsight;
}
export async function getLatestInsightForToday(supabase:WebSupabaseClient){
 const access=await requireInsightAccess(supabase);if(!access.allowed)return {allowed:false,insight:null};
 const {data,error}=await supabase.from('weekly_insights').select('id,period_start,period_end,insight_json').eq('user_id',access.user.id).eq('status','completed').order('period_end',{ascending:false}).limit(1).maybeSingle();
 if(error)throw new Error('Weekly insight could not be loaded.');
 return {allowed:true,insight:data as Pick<WeeklyInsight,'id'|'period_start'|'period_end'|'insight_json'>|null};
}

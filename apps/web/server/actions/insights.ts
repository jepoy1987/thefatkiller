'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { requireInsightAccess } from '../../lib/data/insights';
import { buildWeeklyInsightInput, WEEKLY_PROMPT_VERSION } from '../../features/insights/domain';
import { generateInsightForAuthenticatedOwner } from '../insights/service';

export type InsightActionState={error?:string};
export async function generateWeeklyInsight(_:InsightActionState,form:FormData):Promise<InsightActionState>{
 const supabase=createClient();const access=await requireInsightAccess(supabase);
 if(!access.allowed)return {error:'Weekly insights are not included in your current plan.'};
 const fields=Array.from(form.keys()).filter(key=>!key.startsWith('$ACTION_'));
 if(fields.some(key=>key!=='consent')||form.get('consent')!=='on')return {error:'Confirm sharing the structured summary to generate your insight.'};
 let id:string;
 try {
  const source=await supabase.rpc('get_weekly_insight_source');if(source.error)throw new Error('source_failed');
  const input=buildWeeklyInsightInput(source.data);
  // Reuse completed snapshots even if AI configuration is temporarily unavailable.
  const existing=await supabase.from('weekly_insights').select('id').eq('user_id',access.user.id).eq('period_start',input.period.start).eq('period_end',input.period.end).eq('prompt_version',WEEKLY_PROMPT_VERSION).eq('status','completed').maybeSingle();
  if(existing.error)throw new Error('storage_failed');
  if(existing.data)id=existing.data.id;
  else id=(await generateInsightForAuthenticatedOwner(access.user.id,input)).id;
 }catch(error){
  return {error:error instanceof Error&&error.message==='insufficient_data'?'There are no available data categories to summarize.':error instanceof Error&&error.message==='rate_limited'?'You can generate another period after 24 hours.':error instanceof Error&&error.message==='not_configured'?'AI generation is not available yet. Your recorded summary is available below.':'The insight could not be generated. Please try again later.'};
 }
 revalidatePath('/insights');revalidatePath('/dashboard');redirect('/insights/'+id);
}

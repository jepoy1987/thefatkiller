import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database, WeeklyInsightInput } from '@tfk/types';
import { InsightProviderError, providerConfig, requestWeeklyInsight } from './provider';
import { runWeeklyInsightGeneration, type InsightClaim } from './generation';
/** The only elevated client is isolated here. It never reads health source rows,
 * accepts a user ID from the browser, or exposes its credential to client code.
 * Worker-only RPCs prevent authenticated users from forging generated results. */
export async function generateInsightForAuthenticatedOwner(userId:string,input:WeeklyInsightInput) {
 const config=providerConfig(process.env);
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new InsightProviderError('not_configured');
 const worker=createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}});
 return runWeeklyInsightGeneration(input,{
  async claim(snapshot){const {data,error}=await worker.rpc('claim_weekly_insight',{p_user_id:userId,p_input:JSON.parse(JSON.stringify(snapshot))});if(error)throw new Error(error.code==='54000'?'rate_limited':'claim_failed');return data as unknown as InsightClaim;},
  async finish(id,attempt,result,model,errorCode){const {data,error}=await worker.rpc('finish_weekly_insight',{p_id:id,p_user_id:userId,p_attempt:attempt,p_result:result?JSON.parse(JSON.stringify(result)):null,p_model:model??'',p_error:errorCode??undefined});if(error)throw new Error('storage_failed');return data===true;},
  provider:snapshot=>requestWeeklyInsight(snapshot,config),
  log:event=>console.info('weekly_insight',event),
 });
}

import type { WeeklyInsightInput, WeeklyInsightResult } from '@tfk/types';
import { weeklyInsightInputSchema } from '@tfk/validation';
import { InsightProviderError } from './provider';
import { insightFacts, validateWeeklyInsightOutput, WEEKLY_PROMPT_VERSION } from '../../features/insights/domain';

export type InsightClaim={id:string;claimed:boolean;attempt?:number;status:string};
export type InsightGenerationDependencies={
 claim:(input:WeeklyInsightInput)=>Promise<InsightClaim>;
 finish:(id:string,attempt:number,result:WeeklyInsightResult|null,model:string|null,error:string|null)=>Promise<boolean>;
 provider:(input:WeeklyInsightInput)=>Promise<{output:unknown;model:string;tokens:number|null}>;
 log:(event:{id:string;prompt_version:string;status:string;model:string|null;latency_ms:number;tokens:number|null})=>void;
};
/** Dependency-injected core; no environment access or network calls in tests. */
export async function runWeeklyInsightGeneration(raw:unknown,deps:InsightGenerationDependencies) {
 const input=weeklyInsightInputSchema.parse(raw);if(!insightFacts(input).length)throw new Error('insufficient_data');const claim=await deps.claim(input);
 if(!claim.claimed)return {id:claim.id,status:claim.status};
 const start=Date.now();let model:string|null=null;let tokens:number|null=null;let result:WeeklyInsightResult|null=null;let error:string|null=null;
 try {
  const response=await deps.provider(input);model=response.model;tokens=response.tokens;
  try{result=validateWeeklyInsightOutput(response.output,input);}catch{throw new InsightProviderError('invalid_output');}
 }catch(cause){error=cause instanceof InsightProviderError?cause.code:'provider_failed';}
 let saved=false;
 try{saved=await deps.finish(claim.id,claim.attempt!,result,model,error);}catch{ /* Emit metadata only; keep pending lease recoverable. */ }
 deps.log({id:claim.id,prompt_version:WEEKLY_PROMPT_VERSION,status:saved?(error?'failed':'completed'):'storage_failed',model,latency_ms:Date.now()-start,tokens});
 if(!saved)throw new Error('Insight persistence unavailable');
 return {id:claim.id,status:error?'failed':'completed'};
}

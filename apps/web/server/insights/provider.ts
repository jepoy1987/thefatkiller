import type { WeeklyInsightInput } from '@tfk/types';
import { weeklyNarrative, evidenceTitles, focusTitles, insightDataGaps, insightFacts, WEEKLY_SYSTEM_PROMPT } from '../../features/insights/domain';

export type ProviderConfig={apiKey:string;model:string};
export class InsightProviderError extends Error {
 constructor(public code:'provider_failed'|'invalid_output'|'timeout'|'not_configured') { super(code); }
}
export function providerConfig(env:Record<string,string|undefined>):ProviderConfig {
 if(!env.OPENAI_API_KEY||!env.AI_WEEKLY_MODEL)throw new InsightProviderError('not_configured');
 return {apiKey:env.OPENAI_API_KEY,model:env.AI_WEEKLY_MODEL};
}
const string={type:'string'};
const categories=['progress','nutrition','hydration','habits','daily_check_ins','weekly_check_ins','training','coaching','score'];
const category={type:'string',enum:categories};
const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const item=object({title:{type:'string',enum:Object.values(evidenceTitles)},evidence:string,category});
export const weeklyOutputJsonSchema=object({headline:{type:'string',enum:[weeklyNarrative.headline]},summary:{type:'string',enum:[weeklyNarrative.summary]},wins:{type:'array',maxItems:4,items:item},watch_items:{type:'array',maxItems:4,items:item},next_week_focus:{type:'array',minItems:1,maxItems:3,items:object({title:{type:'string',enum:Object.values(focusTitles)},reason:string,category})},data_gaps:{type:'array',maxItems:12,items:string}});
/** Server transport only. Imported exclusively by the server-only generation
 * module; config is explicit so contract tests cannot pick up ambient secrets. */
export async function requestWeeklyInsight(input:WeeklyInsightInput,config:ProviderConfig,fetcher:typeof fetch=fetch):Promise<{output:unknown;model:string;tokens:number|null}> {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try {
  const response=await fetcher('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({model:config.model,store:false,max_output_tokens:2200,
    instructions:WEEKLY_SYSTEM_PROMPT,input:JSON.stringify({summary:input,facts:insightFacts(input),allowed_narrative:weeklyNarrative,evidence_titles:evidenceTitles,allowed_focus_titles:focusTitles,data_gaps:insightDataGaps(input)}),
    text:{format:{type:'json_schema',name:'tfk_weekly_insight',strict:true,schema:weeklyOutputJsonSchema}}}),
  });
  if(!response.ok)throw new InsightProviderError('provider_failed');
  const result=await response.json();
  if(result.status!=='completed'||!Array.isArray(result.output))throw new InsightProviderError('invalid_output');
  const content=result.output.flatMap((entry:{content?:unknown[]})=>Array.isArray(entry.content)?entry.content:[]);
  if(content.some((part:{type?:string})=>part.type==='refusal'))throw new InsightProviderError('invalid_output');
  const texts=content.filter((part:{type?:string})=>part.type==='output_text');
  if(texts.length!==1||typeof texts[0].text!=='string'||texts[0].text.length>12000)throw new InsightProviderError('invalid_output');
  let output:unknown;try{output=JSON.parse(texts[0].text);}catch{throw new InsightProviderError('invalid_output');}
  return {output,model:config.model,tokens:Number.isSafeInteger(result.usage?.total_tokens)?result.usage.total_tokens:null};
 } catch(error) {
  if(error instanceof InsightProviderError)throw error;
  throw new InsightProviderError(controller.signal.aborted?'timeout':'provider_failed');
 } finally {clearTimeout(timer);}
}

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database,FoodPhotoAnalysis,FoodPhotoResult } from '@tfk/types';
import { openAIPhotoProvider,FoodPhotoError } from './provider';
import { runFoodPhoto } from './generation';
export function foodPhotoMode(env:NodeJS.ProcessEnv=process.env):'openai'|'local_mock'|'disabled'{
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return 'disabled';
 const url=env.NEXT_PUBLIC_SUPABASE_URL??'';
 if(!env.VERCEL&&env.AI_FOOD_LOCAL_MOCK==='true'&&/^http:\/\/(127\.0\.0\.1|localhost):/.test(url))return 'local_mock';
 return env.OPENAI_API_KEY&&env.AI_FOOD_MODEL?'openai':'disabled';
}
const worker=()=>createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const mockResult:FoodPhotoResult={items:[{name:'Local test meal (mock)',estimated_portion:{amount:150,unit:'g'},estimated_calories:240,protein_g:20,carbs_g:25,fat_g:7,confidence:0.5}],meal_totals:{calories:240,protein_g:20,carbs_g:25,fat_g:7},uncertainties:['Local QA fixture only. No image recognition occurred.']};
export async function cleanupFoodPhotos(userId:string){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return;
 const client=worker();const {data,error}=await client.from('food_photo_analyses').select('*').eq('user_id',userId).lt('started_at',new Date(Date.now()-120000).toISOString()).order('created_at').limit(50);
 if(error)throw new Error('Photo cleanup unavailable.');
 for(const a of data??[]){
  if(a.storage_path){const removed=await client.storage.from('food-analysis').remove([a.storage_path]);if(removed.error)continue;await client.rpc('clear_food_photo_storage',{p_id:a.id,p_user_id:userId,p_path:a.storage_path});}
  if(Date.parse(a.expires_at)<=Date.now())await client.rpc('expire_food_photo',{p_id:a.id,p_user_id:userId});
 }
}
export async function analyzeFoodPhoto(userId:string,id:string,retry:boolean,image:Uint8Array){
 const mode=foodPhotoMode();if(mode==='disabled')throw new FoodPhotoError('not_configured');
 const client=worker();await cleanupFoodPhotos(userId);
 return runFoodPhoto(image,{
  claim:async()=>{const {data,error}=await client.rpc('claim_food_photo',{p_id:id,p_user_id:userId,p_retry:retry});if(error)throw new Error(error.code==='54000'?'Analysis limit reached. Try later or log manually.':'Analysis unavailable.');return data as unknown as {claimed:boolean;analysis:FoodPhotoAnalysis};},
  upload:async(path,bytes)=>{const {error}=await client.storage.from('food-analysis').upload(path,bytes,{contentType:'image/jpeg',upsert:false});if(error)throw new FoodPhotoError('upload_failed');},
  remove:async(path)=>{const {error}=await client.storage.from('food-analysis').remove([path]);if(error)throw new FoodPhotoError('cleanup_failed');},
  finish:async(a,result,error,deleted)=>{const r=await client.rpc('finish_food_photo',{p_id:a.id,p_user_id:userId,p_attempt:a.attempts,p_result:result?JSON.parse(JSON.stringify(result)):null,p_provider:mode==='local_mock'?'local_mock':'openai',p_model:mode==='local_mock'?'fixture':process.env.AI_FOOD_MODEL!,p_error:error??'',p_deleted:deleted});if(r.error||!r.data)throw new Error('Analysis could not be recorded. Retry explicitly.');},
  provider:mode==='local_mock'?async()=>mockResult:openAIPhotoProvider({apiKey:process.env.OPENAI_API_KEY!,model:process.env.AI_FOOD_MODEL!}),
 });
}

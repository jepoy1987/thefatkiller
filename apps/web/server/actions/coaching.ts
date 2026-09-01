'use server';

import { coachGoalSchema, coachNoteSchema, coachingPrivacySchema } from '@tfk/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
import { formValue, redirectWithError } from './form';

const checked=(data:FormData,key:string)=>data.get(key)==='on';
const finish=(path:string,message:string)=>{revalidatePath(path);revalidatePath('/dashboard');redirect(`${path}?message=${encodeURIComponent(message)}`);};

export async function saveCoachGoal(data:FormData) {
  const clientId=formValue(data,'client_id'); const path=`/coach/clients/${clientId}`;
  const parsed=coachGoalSchema.safeParse({client_id:clientId,title:formValue(data,'title'),description:formValue(data,'description'),category:formValue(data,'category'),target_date:formValue(data,'target_date'),priority:formValue(data,'priority'),client_visible:checked(data,'client_visible')});
  if(!parsed.success) redirectWithError(path,parsed.error.issues[0]?.message??'Invalid goal.');
  const input=parsed.data!; const supabase=createClient(); await requireUser(supabase);
  const {error}=await supabase.rpc('save_coach_goal',{p_client_id:input.client_id,p_title:input.title,p_description:input.description??'',p_category:input.category,p_target_date:input.target_date||null,p_priority:input.priority,p_client_visible:input.client_visible});
  if(error) redirectWithError(path,'Goal could not be saved.'); finish(path,'Goal saved.');
}

export async function updateCoachGoal(data:FormData) {
  const clientId=formValue(data,'client_id'); const path=`/coach/clients/${clientId}`;
  const parsed=coachGoalSchema.safeParse({client_id:clientId,title:formValue(data,'title'),description:formValue(data,'description'),category:formValue(data,'category'),target_date:formValue(data,'target_date'),priority:formValue(data,'priority'),client_visible:checked(data,'client_visible')});
  if(!parsed.success) redirectWithError(path,parsed.error.issues[0]?.message??'Invalid goal.');
  const input=parsed.data!; const supabase=createClient(); await requireUser(supabase);
  const {error}=await supabase.rpc('update_coach_goal',{p_goal_id:formValue(data,'goal_id'),p_title:input.title,p_description:input.description??'',p_category:input.category,p_target_date:input.target_date||null,p_priority:input.priority,p_client_visible:input.client_visible});
  if(error) redirectWithError(path,'Goal could not be updated.'); finish(path,'Goal saved.');
}

async function setGoalStatus(data:FormData,status:'completed'|'archived') {
  const clientId=formValue(data,'client_id'); const path=`/coach/clients/${clientId}`; const supabase=createClient(); await requireUser(supabase);
  const {error}=await supabase.rpc('set_coach_goal_status',{p_goal_id:formValue(data,'goal_id'),p_status:status});
  if(error) redirectWithError(path,'Goal could not be updated.'); finish(path,status==='completed'?'Goal completed.':'Goal archived.');
}
export async function completeCoachGoal(data:FormData){return setGoalStatus(data,'completed');}
export async function archiveCoachGoal(data:FormData){return setGoalStatus(data,'archived');}

export async function saveCoachNote(data:FormData) {
  const clientId=formValue(data,'client_id'); const path=`/coach/clients/${clientId}`;
  const parsed=coachNoteSchema.safeParse({client_id:clientId,note:formValue(data,'note'),client_visible:checked(data,'client_visible')});
  if(!parsed.success) redirectWithError(path,parsed.error.issues[0]?.message??'Invalid note.');
  const input=parsed.data!; const supabase=createClient(); await requireUser(supabase);
  const {error}=await supabase.rpc('save_coach_note',{p_client_id:input.client_id,p_note:input.note,p_client_visible:input.client_visible});
  if(error) redirectWithError(path,'Note could not be saved.'); finish(path,'Note saved.');
}

export async function updateCoachingPrivacy(data:FormData) {
  const parsed=coachingPrivacySchema.safeParse({share_progress:checked(data,'share_progress'),share_nutrition:checked(data,'share_nutrition'),share_accountability:checked(data,'share_accountability'),share_glp1_summary:checked(data,'share_glp1_summary'),share_glp1_details:false});
  if(!parsed.success) redirectWithError('/coaching','Invalid sharing settings.');
  const supabase=createClient(); const user=await requireUser(supabase);
  const {error}=await supabase.from('coaching_privacy_settings').upsert({user_id:user.id,...parsed.data!});
  if(error) redirectWithError('/coaching','Sharing settings could not be updated.'); finish('/coaching','Sharing settings updated.');
}

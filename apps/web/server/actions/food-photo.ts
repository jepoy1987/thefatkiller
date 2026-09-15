'use server';
import { foodPhotoReviewSchema } from '@tfk/validation';
import { zonedDateTimeToIso } from '@tfk/api';
import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
import { getProfile } from '../../lib/data/profile';
export async function confirmPhotoReview(id:string,input:unknown){
 const client=(await createClient());const user=await requireUser(client);const profile=await getProfile(client,user.id);
 try{
  if(!input||typeof input!=='object')return {error:'Invalid review.'};
  const value=input as Record<string,unknown>;
  const parsed=foodPhotoReviewSchema.safeParse({...value,logged_at:zonedDateTimeToIso(String(value.logged_at),profile.timezone)});
  if(!parsed.success)return {error:parsed.error.issues[0]?.message??'Check your review.'};
  const result=await client.rpc('confirm_food_photo',{p_id:id,p_items:parsed.data.items,p_meal_type:parsed.data.meal_type,p_logged_at:parsed.data.logged_at,p_notes:parsed.data.notes});
  if(result.error)return {error:'This analysis could not be saved. It may have expired or your access changed.'};
  revalidatePath('/nutrition');revalidatePath('/dashboard');revalidatePath(`/nutrition/photo/${id}`);
  return {date:String(value.logged_at).slice(0,10)};
 }catch{return {error:'Choose a valid meal time and review all items.'};}
}

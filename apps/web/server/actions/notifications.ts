'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { reminderPreferencesSchema } from '@tfk/validation';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
import { reminderFormValues } from '../../features/notifications/domain';
export type NotificationActionState={error?:string;message?:string};
export async function saveReminderPreferences(_:NotificationActionState,form:FormData):Promise<NotificationActionState>{
 const client=(await createClient());const user=await requireUser(client);
 const parsed=reminderPreferencesSchema.safeParse(reminderFormValues(form));
 if(!parsed.success)return {error:parsed.error.issues[0]?.message??'Check your reminder settings.'};
 const {error}=await client.from('reminder_preferences').upsert({user_id:user.id,...parsed.data});
 if(error)return {error:'Reminder settings could not be saved. Please try again.'};
 revalidatePath('/settings/notifications');return {message:'Reminder preferences saved.'};
}
export async function changeNotificationReadState(_:NotificationActionState,form:FormData):Promise<NotificationActionState>{
 const client=(await createClient());await requireUser(client);
 const all=form.get('operation')==='all';
 if(!all&&!z.string().uuid().safeParse(form.get('id')).success)return {error:'Choose a valid notification.'};
 const result=all?await client.rpc('mark_all_notifications_read'):await client.rpc('set_notification_read',{p_id:String(form.get('id')),p_read:form.get('read')==='true'});
 if(result.error||result.data===false)return {error:'This notification could not be updated. Please refresh and try again.'};
 revalidatePath('/','layout');return {message:all?'All notifications marked read.':'Notification updated.'};
}

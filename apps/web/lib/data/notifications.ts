import 'server-only';
import { cache } from 'react';
import type { Notification,ReminderPreferences } from '@tfk/types';
import { createClient } from './client';
import { requireUser } from './session';
import { getProfile } from './profile';
import { defaultReminderPreferences } from '../../features/notifications/domain';
export const getUnreadNotificationCount=cache(async()=>{
 const client=(await createClient());await requireUser(client);
 const {data,error}=await client.rpc('notification_unread_count');
 if(error)throw new Error('Notification count could not be loaded.');
 return data;
});
export async function getNotifications(){
 const client=(await createClient());const user=await requireUser(client);
 const [{data,error},profile,count]=await Promise.all([client.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),getProfile(client,user.id),getUnreadNotificationCount()]);
 if(error)throw new Error('Notifications could not be loaded.');
 return {notifications:data as unknown as Notification[],timezone:profile.timezone,count};
}
export async function getReminderPreferences(){
 const client=(await createClient());const user=await requireUser(client);
 const [{data,error},profile]=await Promise.all([client.from('reminder_preferences').select('*').eq('user_id',user.id).maybeSingle(),getProfile(client,user.id)]);
 if(error)throw new Error('Reminder settings could not be loaded.');
 const preferences={...defaultReminderPreferences};
 if(data)for(const key of Object.keys(preferences) as Array<keyof ReminderPreferences>){const value=data[key];Object.assign(preferences,{[key]:typeof value==='string'?value.slice(0,5):value});}
 return {preferences,timezone:profile.timezone,configured:!!data};
}

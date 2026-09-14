import type { ReminderPreferences } from '@tfk/types';
export const defaultReminderPreferences:ReminderPreferences={weigh_in_enabled:false,weigh_in_time:'08:00',weigh_in_days_of_week:[1,3,5],daily_check_in_enabled:true,daily_check_in_time:'20:00',weekly_check_in_enabled:true,weekly_check_in_day:0,weekly_check_in_time:'18:00',habit_reminders_enabled:true,habit_reminder_time:'18:00',workout_reminders_enabled:true,workout_reminder_minutes_before:60,workout_reminder_time:'09:00',glp1_journal_enabled:false,glp1_journal_time:'20:00',quiet_hours_enabled:false,quiet_hours_start:'22:00',quiet_hours_end:'07:00'};
export function unreadLabel(count:number){return count>100?'100+':String(count);}
export function notificationExpired(expiresAt:string|null,now:Date){return expiresAt!==null&&new Date(expiresAt)<=now;}
export function reminderFormValues(form:FormData):ReminderPreferences {
 return Object.fromEntries(Object.entries(defaultReminderPreferences).map(([key,value])=>[key,
  typeof value==='boolean'?form.get(key)==='on':typeof value==='number'?Number(form.get(key)):Array.isArray(value)?form.getAll(key).map(Number):String(form.get(key)??'')])) as unknown as ReminderPreferences;
}

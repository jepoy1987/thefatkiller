export type NotificationChannel = 'in_app';
export type ReminderCategory = 'weigh_in' | 'daily_check_in' | 'weekly_check_in' | 'habit' | 'workout' | 'glp1_journal';
export type NotificationType = `${ReminderCategory}_reminder` | 'system';
export interface DueReminder { type: NotificationType; title: string; message: string; action_url: string | null; dedupe_key: string }
export interface Notification extends DueReminder { id: string; user_id: string; metadata: Record<string, unknown>; read_at: string | null; created_at: string; expires_at: string | null }
export interface ReminderPreferences {
 weigh_in_enabled: boolean; weigh_in_time: string; weigh_in_days_of_week: number[];
 daily_check_in_enabled: boolean; daily_check_in_time: string;
 weekly_check_in_enabled: boolean; weekly_check_in_day: number; weekly_check_in_time: string;
 habit_reminders_enabled: boolean; habit_reminder_time: string;
 workout_reminders_enabled: boolean; workout_reminder_minutes_before: number; workout_reminder_time: string;
 glp1_journal_enabled: boolean; glp1_journal_time: string;
 quiet_hours_enabled: boolean; quiet_hours_start: string; quiet_hours_end: string;
}
export interface ReminderEvaluationResult { run_at: string; users_evaluated: number; notifications_inserted: number; duplicates: number; errors: number }

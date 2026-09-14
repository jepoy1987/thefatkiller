import { SettingsShell } from '../../../components/layout/settings-shell';
import { getReminderPreferences } from '../../../lib/data/notifications';
import { ReminderSettingsForm } from '../../../features/notifications/forms';
export default async function NotificationSettingsPage(){
 const {preferences,timezone,configured}=await getReminderPreferences();
 return <SettingsShell active="notifications"><div className="grid max-w-3xl gap-5"><h2 className="text-2xl font-bold">Notifications & reminders</h2><p className="text-sm text-muted-foreground">Times use your profile timezone: <strong>{timezone}</strong>. {configured?'Your saved preferences are shown below.':'No reminders are configured yet. Review these defaults and save to enable them.'}</p><ReminderSettingsForm preferences={preferences}/></div></SettingsShell>;
}

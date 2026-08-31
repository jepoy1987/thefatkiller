import { SettingsShell } from '../../../components/layout/settings-shell';
import { Alert } from '../../../components/ui/alert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { GoalSettingsForm } from '../../../features/goals/goal-settings-form';
import { getDashboardFoundation } from '../../../lib/data/dashboard';

export default async function GoalSettingsPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const { dashboard } = await getDashboardFoundation();
  return <SettingsShell active="goals"><div className="grid gap-4">{searchParams.error ? <Alert variant="error">{searchParams.error}</Alert> : null}{searchParams.message ? <Alert variant="success">{searchParams.message}</Alert> : null}<Card><CardHeader title="Goal and daily targets" description="Planning values used on Today. Updates are saved together; this is not medical advice." /><CardContent><GoalSettingsForm profileUnits={dashboard.profile.unit_system} goal={dashboard.goal} /></CardContent></Card></div></SettingsShell>;
}

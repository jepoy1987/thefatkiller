import { ProfileSettingsForm } from '../../../features/profile/profile-settings-form';
import { getCurrentProfile } from '../../../lib/data/profile';

export default async function ProfileSettingsPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const { profile } = await getCurrentProfile();
  return (
    <SettingsShell active="profile"><div className="grid gap-4">{searchParams.error ? <Alert variant="error">{searchParams.error}</Alert> : null}{searchParams.message ? <Alert variant="success">{searchParams.message}</Alert> : null}<Card><CardHeader title="Personal details" description="The information used across your TFK experience." /><CardContent><ProfileSettingsForm profile={profile} /></CardContent></Card></div></SettingsShell>
  );
}
import { SettingsShell } from '../../../components/layout/settings-shell';
import { Alert } from '../../../components/ui/alert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';

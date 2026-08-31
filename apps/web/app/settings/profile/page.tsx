import { ProfileSettingsForm } from '../../../features/profile/profile-settings-form';
import { getCurrentProfile } from '../../../lib/data/profile';

export default async function ProfileSettingsPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const { profile } = await getCurrentProfile();
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold">Profile settings</h1>
        {searchParams.error && <p className="mt-4 text-sm text-red-700">{searchParams.error}</p>}
        {searchParams.message && <p className="mt-4 text-sm text-green-700">{searchParams.message}</p>}
        <ProfileSettingsForm profile={profile} />
      </div>
    </main>
  );
}

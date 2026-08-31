import { updateProfile } from '../../actions';
import { requireProfile } from '../../../lib/auth';

export default async function ProfileSettingsPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const { profile } = await requireProfile();
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold">Profile settings</h1>
        {searchParams.error && <p className="mt-4 text-sm text-red-700">{searchParams.error}</p>}
        {searchParams.message && <p className="mt-4 text-sm text-green-700">{searchParams.message}</p>}
        <form action={updateProfile} className="mt-6 grid gap-4">
          <input name="first_name" defaultValue={profile.first_name ?? ''} className="rounded border px-3 py-2" placeholder="First name" />
          <input name="last_name" defaultValue={profile.last_name ?? ''} className="rounded border px-3 py-2" placeholder="Last name" />
          <input name="display_name" defaultValue={profile.display_name ?? ''} className="rounded border px-3 py-2" placeholder="Display name" />
          <input name="date_of_birth" defaultValue={profile.date_of_birth ?? ''} className="rounded border px-3 py-2" type="date" />
          <select name="unit_system" defaultValue={profile.unit_system} className="rounded border px-3 py-2">
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
          <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Save changes</button>
        </form>
      </div>
    </main>
  );
}

import { completeOnboarding } from '../actions';
import { requireProfile } from '../../lib/auth';

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile } = await requireProfile({ requireOnboarding: false });
  if (profile.onboarding_completed) {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard');
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6">
      <div className="w-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold">Welcome to TFK</h1>
        <p className="mt-2 text-sm text-slate-600">Complete your foundation profile to continue.</p>
        {searchParams.error && <p className="mt-4 text-sm text-red-700">{searchParams.error}</p>}
        <form action={completeOnboarding} className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input name="first_name" required defaultValue={profile.first_name ?? ''} className="rounded border px-3 py-2" placeholder="First name" />
            <input name="last_name" required defaultValue={profile.last_name ?? ''} className="rounded border px-3 py-2" placeholder="Last name" />
          </div>
          <input name="display_name" required defaultValue={profile.display_name ?? ''} className="rounded border px-3 py-2" placeholder="Display name" />
          <input name="date_of_birth" required defaultValue={profile.date_of_birth ?? ''} className="rounded border px-3 py-2" type="date" />
          <select name="unit_system" defaultValue={profile.unit_system} className="rounded border px-3 py-2">
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
          <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Finish onboarding</button>
        </form>
      </div>
    </main>
  );
}

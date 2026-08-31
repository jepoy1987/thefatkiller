import { OnboardingForm } from '../../features/onboarding/onboarding-form';
import { getOnboardingFoundation } from '../../lib/data/dashboard';

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile } = await getOnboardingFoundation();
  return <main className="mx-auto min-h-screen max-w-3xl p-6"><div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-semibold text-emerald-700">Account setup</p>
    <h1 className="mt-1 text-3xl font-bold">Build your daily plan</h1>
    <p className="mt-2 text-sm text-slate-600">Four short sections establish your profile and targets. These are planning values, not medical advice.</p>
    {searchParams.error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p> : null}
    <OnboardingForm profile={profile} />
  </div></main>;
}

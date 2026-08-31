import Link from 'next/link';
import { GoalSettingsForm } from '../../../features/goals/goal-settings-form';
import { getDashboardFoundation } from '../../../lib/data/dashboard';

export default async function GoalSettingsPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const { dashboard } = await getDashboardFoundation();
  return <main className="mx-auto max-w-2xl p-8"><div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"><h1 className="text-3xl font-bold">Goal settings</h1><p className="mt-2 text-sm text-slate-600">Targets are planning inputs and not medical advice.</p>
    {searchParams.error && <p className="mt-4 text-sm text-red-700">{searchParams.error}</p>}{searchParams.message && <p className="mt-4 text-sm text-green-700">{searchParams.message}</p>}
    <GoalSettingsForm profileUnits={dashboard.profile.unit_system} goal={dashboard.goal} /><Link className="mt-6 inline-block" href="/dashboard">Back to Today</Link>
  </div></main>;
}

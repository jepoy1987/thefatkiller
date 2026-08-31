import Link from 'next/link';
import { DashboardHeader, NextActionsCard, TargetCard, WeightGoalCard } from '../../features/dashboard/components';
import { getDashboardFoundation } from '../../lib/data/dashboard';
import { logout } from '../../server/actions/auth';

export default async function DashboardPage() {
  const { dashboard } = await getDashboardFoundation();
  return <main className="mx-auto max-w-5xl p-8"><div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
    <DashboardHeader name={dashboard.welcomeName} />
    <h2 className="mt-8 text-xl font-semibold">Today&apos;s Progress</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{dashboard.targets.map((target) => <TargetCard key={target.key} target={target} />)}</div>
    <WeightGoalCard weightGoal={dashboard.weightGoal} />
    <NextActionsCard actions={dashboard.nextActions} />
    <div className="mt-8 flex flex-wrap gap-4"><Link href="/settings/profile">Profile settings</Link><Link href="/settings/goals">Goal settings</Link><form action={logout}><button type="submit">Log out</button></form></div>
  </div></main>;
}

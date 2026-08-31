import { AppShell } from '../../components/layout/app-shell';
import { SectionHeader } from '../../components/ui/headings';
import { DashboardHeader, NextActionsCard, TargetCard, WeightGoalCard } from '../../features/dashboard/components';
import { getDashboardFoundation } from '../../lib/data/dashboard';

export default async function DashboardPage() {
  const { dashboard } = await getDashboardFoundation();
  return <AppShell active="today"><div className="grid gap-8">
    <DashboardHeader name={dashboard.welcomeName} />
    <section className="grid gap-4"><SectionHeader title="Today’s targets" description="Stored planning targets from your active goal. Progress stays at zero until tracking is available." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{dashboard.targets.map((target) => <TargetCard key={target.key} target={target} />)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><WeightGoalCard weightGoal={dashboard.weightGoal} /><NextActionsCard actions={dashboard.nextActions} /></section>
  </div></AppShell>;
}

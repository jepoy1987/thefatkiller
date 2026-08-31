import type { DashboardTarget, TodayDashboardData } from '@tfk/types';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/headings';
import { StatCard } from '../../components/ui/stat-card';
export { DashboardAccountability } from '../accountability/components';

const formatTarget = (target: DashboardTarget) => `${target.current.toLocaleString()} / ${target.target.toLocaleString()}${target.unit ? ` ${target.unit}` : ''}`;

export function DashboardHeader({ name }: { name: string }) {
  return <PageHeader eyebrow="Today" title={`Welcome, ${name}`} description="What do I need to do today? Your plan is ready—focus on one target at a time." />;
}

export function TargetCard({ target }: { target: DashboardTarget }) {
  const remaining = Math.max(target.target - target.current, 0);
  const helper = target.current > target.target ? `${(target.current - target.target).toLocaleString()}${target.unit ? ` ${target.unit}` : ''} over target` : `${remaining.toLocaleString()}${target.unit ? ` ${target.unit}` : ''} remaining`;
  return <StatCard label={target.label} value={formatTarget(target)} helper={helper} accent={<span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Today</span>} />;
}

export function WeightGoalCard({ weightGoal }: Pick<TodayDashboardData, 'weightGoal'>) {
  return <Card><CardHeader title="Weight goal" description="Your latest logged weight and current target." /><CardContent><div className="grid grid-cols-3 gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Starting</p><p className="mt-1 text-xl font-bold">{weightGoal.starting} <span className="text-sm font-semibold text-muted-foreground">{weightGoal.unit}</span></p></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current</p><p className="mt-1 text-xl font-bold">{weightGoal.current} <span className="text-sm font-semibold text-muted-foreground">{weightGoal.unit}</span></p></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Goal</p><p className="mt-1 text-xl font-bold text-primary">{weightGoal.target} <span className="text-sm font-semibold text-muted-foreground">{weightGoal.unit}</span></p></div></div></CardContent></Card>;
}

export function NextActionsCard({ actions }: { actions: string[] }) {
  return <Card className="border-success/20 bg-success/5"><CardHeader title="Next actions" description="Your foundation is set. Here is what comes next." /><CardContent><ul className="grid gap-3">{actions.map((action, index) => <li key={action} className="flex items-start gap-3 text-sm leading-6"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-[10px] font-black text-success" aria-hidden="true">{index + 1}</span>{action}</li>)}</ul></CardContent></Card>;
}

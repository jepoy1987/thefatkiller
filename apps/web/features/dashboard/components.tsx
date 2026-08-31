import type { DashboardTarget, TodayDashboardData } from '@tfk/types';

const formatTarget = (target: DashboardTarget) => `${target.current.toLocaleString()} / ${target.target.toLocaleString()}${target.unit ? ` ${target.unit}` : ''}`;

export function DashboardHeader({ name }: { name: string }) {
  return <><h1 className="text-4xl font-bold">Welcome, {name}</h1><p className="mt-2 text-slate-600">What do I need to do today?</p></>;
}

export function TargetCard({ target }: { target: DashboardTarget }) {
  return <div className="rounded-xl bg-slate-100 p-4"><p className="text-sm text-slate-600">{target.label}</p><p className="mt-1 text-xl font-semibold">{formatTarget(target)}</p><p className="mt-2 text-xs text-slate-500">Tracking starts in the next sprint</p></div>;
}

export function WeightGoalCard({ weightGoal }: Pick<TodayDashboardData, 'weightGoal'>) {
  return <section className="mt-6 rounded-xl border p-5"><h2 className="font-semibold">Weight Goal</h2><p className="mt-2 text-slate-700">Starting: {weightGoal.starting} {weightGoal.unit}</p><p className="text-slate-700">Goal: {weightGoal.target} {weightGoal.unit}</p></section>;
}

export function NextActionsCard({ actions }: { actions: string[] }) {
  return <section className="mt-6 rounded-xl bg-emerald-50 p-5"><h2 className="font-semibold">Next Actions</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{actions.map((action) => <li key={action}>{action}</li>)}</ul></section>;
}

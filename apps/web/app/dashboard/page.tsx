import Link from 'next/link';
import { waterFromMilliliters, weightFromKilograms, weightLabel } from '@tfk/validation';
import { logout } from '../actions';
import { requireDashboard } from '../../lib/auth';

export default async function DashboardPage() {
  const { profile, goal } = await requireDashboard();
  const weightUnit = weightLabel(profile.unit_system);
  const waterUnit = profile.unit_system === 'imperial' ? 'fl oz' : 'ml';
  const cards = [['Calories', `0 / ${goal.daily_calorie_target.toLocaleString()}`], ['Protein', `0 / ${goal.daily_protein_target} g`], ['Carbs', `0 / ${goal.daily_carbs_target} g`], ['Fat', `0 / ${goal.daily_fat_target} g`], ['Water', `0 / ${waterFromMilliliters(goal.daily_water_target, profile.unit_system).toLocaleString()} ${waterUnit}`], ['Steps', `0 / ${goal.daily_step_target.toLocaleString()}`]];
  return <main className="mx-auto max-w-5xl p-8"><div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
    <h1 className="text-4xl font-bold">Welcome, {profile.display_name ?? profile.first_name ?? 'there'}</h1><p className="mt-2 text-slate-600">What do I need to do today?</p>
    <h2 className="mt-8 text-xl font-semibold">Today&apos;s Progress</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label,target]) => <div key={label} className="rounded-xl bg-slate-100 p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-xl font-semibold">{target}</p><p className="mt-2 text-xs text-slate-500">Tracking starts in the next sprint</p></div>)}</div>
    <section className="mt-6 rounded-xl border p-5"><h2 className="font-semibold">Weight Goal</h2><p className="mt-2 text-slate-700">Starting: {weightFromKilograms(goal.starting_weight, profile.unit_system)} {weightUnit}</p><p className="text-slate-700">Goal: {weightFromKilograms(goal.goal_weight, profile.unit_system)} {weightUnit}</p></section>
    <section className="mt-6 rounded-xl bg-emerald-50 p-5"><h2 className="font-semibold">Next Actions</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700"><li>Set up complete</li><li>Nutrition tracking coming next</li><li>Water tracking coming next</li><li>Progress tracking coming next</li></ul></section>
    <div className="mt-8 flex flex-wrap gap-4"><Link href="/settings/profile">Profile settings</Link><Link href="/settings/goals">Goal settings</Link><form action={logout}><button type="submit">Log out</button></form></div>
  </div></main>;
}

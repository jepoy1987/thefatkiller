import { redirect } from 'next/navigation';
import { completeOnboarding } from '../actions';
import { requireProfile } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

const field = 'rounded border border-slate-300 px-3 py-2';

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile } = await requireProfile({ requireOnboarding: false });
  const { data: activeGoal, error } = await createClient().from('user_goals').select('id').eq('is_active', true).maybeSingle();
  if (error) throw new Error('Your goal setup could not be loaded.');
  if (profile.onboarding_completed && activeGoal) redirect('/dashboard');
  return <main className="mx-auto min-h-screen max-w-3xl p-6"><div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-semibold text-emerald-700">Sprint 2 onboarding</p><h1 className="mt-1 text-3xl font-bold">Build your daily plan</h1>
    <p className="mt-2 text-sm text-slate-600">Four short sections establish your profile and targets. These are planning values, not medical advice.</p>
    {searchParams.error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
    <form action={completeOnboarding} className="mt-6 grid gap-6">
      <fieldset className="grid gap-4 rounded-xl border p-5"><legend className="px-2 font-semibold">1 — About You</legend>
        <div className="grid gap-4 md:grid-cols-2"><input name="first_name" required defaultValue={profile.first_name ?? ''} className={field} placeholder="First name" /><input name="last_name" required defaultValue={profile.last_name ?? ''} className={field} placeholder="Last name" /></div>
        <input name="display_name" required defaultValue={profile.display_name ?? ''} className={field} placeholder="Display name" />
        <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm">Date of birth<input name="date_of_birth" required defaultValue={profile.date_of_birth ?? ''} className={field} type="date" /></label><label className="grid gap-1 text-sm">Unit system<select name="unit_system" defaultValue={profile.unit_system} className={field}><option value="metric">Metric (kg, cm, ml)</option><option value="imperial">Imperial (lb, in, fl oz)</option></select></label></div>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border p-5"><legend className="px-2 font-semibold">2 — Your Goal</legend>
        <label className="grid gap-1 text-sm">Goal type<select name="goal_type" defaultValue="lose_weight" className={field}><option value="lose_weight">Lose weight</option><option value="maintain_weight">Maintain weight</option><option value="gain_weight">Gain weight</option></select></label>
        <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-1 text-sm">Starting weight<input name="starting_weight" required min="0.01" step="0.1" type="number" className={field} /></label><label className="grid gap-1 text-sm">Goal weight<input name="goal_weight" required min="0.01" step="0.1" type="number" className={field} /></label><label className="grid gap-1 text-sm">Height<input name="height" required min="0.01" step="0.1" type="number" className={field} /></label></div>
        <label className="grid gap-1 text-sm">Activity level<select name="activity_level" defaultValue="moderately_active" className={field}><option value="sedentary">Sedentary</option><option value="lightly_active">Lightly active</option><option value="moderately_active">Moderately active</option><option value="very_active">Very active</option><option value="extra_active">Extra active</option></select></label>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border p-5"><legend className="px-2 font-semibold">3 — Daily Targets</legend><div className="grid gap-4 md:grid-cols-2">
        {[["daily_calorie_target","Calories","1800"],["daily_protein_target","Protein (g)","140"],["daily_carbs_target","Carbohydrates (g)","180"],["daily_fat_target","Fat (g)","60"],["daily_water_target","Water","2500"],["daily_step_target","Steps","10000"]].map(([name,label,placeholder]) => <label key={name} className="grid gap-1 text-sm">{label}<input name={name} required min={name === 'daily_step_target' ? '0' : '0.01'} step={name === 'daily_step_target' || name === 'daily_calorie_target' ? '1' : '0.1'} type="number" className={field} placeholder={placeholder} /></label>)}
      </div></fieldset>
      <section className="rounded-xl bg-slate-50 p-5"><h2 className="font-semibold">4 — Review</h2><p className="mt-1 text-sm text-slate-600">Submitting saves your profile and active targets together, then opens Today.</p></section>
      <button className="rounded bg-slate-900 px-4 py-3 font-semibold text-white" type="submit">Complete setup</button>
    </form>
  </div></main>;
}

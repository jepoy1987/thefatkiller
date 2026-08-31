import type { Profile } from '@tfk/types';
import type { ReactNode } from 'react';
import { SubmitButton } from '../../components/forms/submit-button';
import { activityOptions, goalTypeOptions, unitOptions } from '../goals/options';
import { completeOnboarding } from '../../server/actions/onboarding';

const fieldClass = 'rounded border border-slate-300 px-3 py-2';
const targetFields = [
  { name: 'daily_calorie_target', label: 'Calories', placeholder: '1800', integer: true, allowZero: false },
  { name: 'daily_protein_target', label: 'Protein (g)', placeholder: '140', integer: false, allowZero: true },
  { name: 'daily_carbs_target', label: 'Carbohydrates (g)', placeholder: '180', integer: false, allowZero: true },
  { name: 'daily_fat_target', label: 'Fat (g)', placeholder: '60', integer: false, allowZero: true },
  { name: 'daily_water_target', label: 'Water', placeholder: '2500', integer: false, allowZero: false },
  { name: 'daily_step_target', label: 'Steps', placeholder: '10000', integer: true, allowZero: true },
] as const;

function OnboardingStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <fieldset className="grid gap-4 rounded-xl border p-5"><legend className="px-2 font-semibold">{number} — {title}</legend>{children}</fieldset>;
}

export function OnboardingForm({ profile }: { profile: Profile }) {
  return <form action={completeOnboarding} className="mt-6 grid gap-6">
    <OnboardingStep number={1} title="About You">
      <div className="grid gap-4 md:grid-cols-2"><input aria-label="First name" name="first_name" required defaultValue={profile.first_name ?? ''} className={fieldClass} placeholder="First name" /><input aria-label="Last name" name="last_name" required defaultValue={profile.last_name ?? ''} className={fieldClass} placeholder="Last name" /></div>
      <input aria-label="Display name" name="display_name" required defaultValue={profile.display_name ?? ''} className={fieldClass} placeholder="Display name" />
      <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm">Date of birth<input name="date_of_birth" required defaultValue={profile.date_of_birth ?? ''} className={fieldClass} type="date" /></label><label className="grid gap-1 text-sm">Unit system<select name="unit_system" defaultValue={profile.unit_system} className={fieldClass}>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
    </OnboardingStep>
    <OnboardingStep number={2} title="Your Goal">
      <label className="grid gap-1 text-sm">Goal type<select name="goal_type" defaultValue="lose_weight" className={fieldClass}>{goalTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-1 text-sm">Starting weight<input name="starting_weight" required min="0.01" step="0.1" type="number" className={fieldClass} /></label><label className="grid gap-1 text-sm">Goal weight<input name="goal_weight" required min="0.01" step="0.1" type="number" className={fieldClass} /></label><label className="grid gap-1 text-sm">Height<input name="height" required min="0.01" step="0.1" type="number" className={fieldClass} /></label></div>
      <label className="grid gap-1 text-sm">Activity level<select name="activity_level" defaultValue="moderately_active" className={fieldClass}>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </OnboardingStep>
    <OnboardingStep number={3} title="Daily Targets"><div className="grid gap-4 md:grid-cols-2">{targetFields.map((target) => <label key={target.name} className="grid gap-1 text-sm">{target.label}<input name={target.name} required min={target.allowZero ? '0' : '0.01'} step={target.integer ? '1' : '0.1'} type="number" className={fieldClass} placeholder={target.placeholder} /></label>)}</div></OnboardingStep>
    <section className="rounded-xl bg-slate-50 p-5"><h2 className="font-semibold">4 — Review</h2><p className="mt-1 text-sm text-slate-600">Submitting saves your profile and active targets together, then opens Today.</p></section>
    <SubmitButton className="rounded bg-slate-900 px-4 py-3 font-semibold text-white" pendingLabel="Completing setup…">Complete setup</SubmitButton>
  </form>;
}

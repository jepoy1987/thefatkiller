'use client';

import type { Profile } from '@tfk/types';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { SubmitButton } from '../../components/forms/submit-button';
import { Card, CardContent } from '../../components/ui/card';
import { FormField, Input, Select } from '../../components/ui/form';
import { activityOptions, goalTypeOptions, unitOptions } from '../goals/options';
import { completeOnboarding } from '../../server/actions/onboarding';

const targetFields = [
  { name: 'daily_calorie_target', label: 'Calories', placeholder: '1800', integer: true, allowZero: false },
  { name: 'daily_protein_target', label: 'Protein (g)', placeholder: '140', integer: false, allowZero: true },
  { name: 'daily_carbs_target', label: 'Carbohydrates (g)', placeholder: '180', integer: false, allowZero: true },
  { name: 'daily_fat_target', label: 'Fat (g)', placeholder: '60', integer: false, allowZero: true },
  { name: 'daily_water_target', label: 'Water', placeholder: '2500', integer: false, allowZero: false },
  { name: 'daily_step_target', label: 'Steps', placeholder: '10000', integer: true, allowZero: true },
] as const;

function OnboardingStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <Card><fieldset><legend className="sr-only">Step {number}: {title}</legend><div className="flex items-center gap-3 border-b px-5 py-4 sm:px-6"><span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{number}</span><h2 className="font-bold">{title}</h2></div><CardContent className="grid gap-5">{children}</CardContent></fieldset></Card>;
}

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [units, setUnits] = useState(profile.unit_system);
  const weightUnit = units === 'imperial' ? 'lb' : 'kg';
  const heightUnit = units === 'imperial' ? 'in' : 'cm';
  const waterUnit = units === 'imperial' ? 'fl oz' : 'ml';
  return <form action={completeOnboarding} className="mt-8 grid gap-5"><ol aria-label="Setup progress" className="grid grid-cols-4 gap-2">{['About you', 'Goal', 'Targets', 'Review'].map((label, index) => <li key={label} className="min-w-0"><span className="block h-1.5 rounded-full bg-primary" /><span className="mt-2 hidden truncate text-xs font-semibold text-muted-foreground sm:block">{index + 1}. {label}</span></li>)}</ol>
    <OnboardingStep number={1} title="About You">
      <div className="grid gap-5 sm:grid-cols-2"><FormField id="first-name" label="First name"><Input id="first-name" name="first_name" required autoComplete="given-name" defaultValue={profile.first_name ?? ''} /></FormField><FormField id="last-name" label="Last name"><Input id="last-name" name="last_name" required autoComplete="family-name" defaultValue={profile.last_name ?? ''} /></FormField></div>
      <FormField id="display-name" label="Display name" hint="This is how we’ll greet you across TFK."><Input id="display-name" name="display_name" required autoComplete="nickname" defaultValue={profile.display_name ?? ''} /></FormField>
      <div className="grid gap-5 sm:grid-cols-2"><FormField id="date-of-birth" label="Date of birth"><Input id="date-of-birth" name="date_of_birth" required defaultValue={profile.date_of_birth ?? ''} type="date" /></FormField><FormField id="unit-system" label="Unit system" hint="Labels and saved values convert automatically."><Select id="unit-system" name="unit_system" value={units} onChange={(event) => setUnits(event.target.value as Profile['unit_system'])}>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField></div>
    </OnboardingStep>
    <OnboardingStep number={2} title="Your Goal">
      <FormField id="goal-type" label="Goal type"><Select id="goal-type" name="goal_type" defaultValue="lose_weight">{goalTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
      <div className="grid gap-5 sm:grid-cols-3"><FormField id="starting-weight" label={`Starting weight (${weightUnit})`}><Input id="starting-weight" name="starting_weight" required min="0.01" step="0.1" type="number" inputMode="decimal" /></FormField><FormField id="goal-weight" label={`Goal weight (${weightUnit})`}><Input id="goal-weight" name="goal_weight" required min="0.01" step="0.1" type="number" inputMode="decimal" /></FormField><FormField id="height" label={`Height (${heightUnit})`}><Input id="height" name="height" required min="0.01" step="0.1" type="number" inputMode="decimal" /></FormField></div>
      <FormField id="activity-level" label="Activity level" hint="Choose the option that best reflects a typical week."><Select id="activity-level" name="activity_level" defaultValue="moderately_active">{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
    </OnboardingStep>
    <OnboardingStep number={3} title="Daily Targets"><p className="text-sm leading-6 text-muted-foreground">Use the planning targets you already established. You can refine them later.</p><div className="grid gap-5 sm:grid-cols-2">{targetFields.map((target) => { const label = target.name === 'daily_water_target' ? `Water (${waterUnit})` : target.label; return <FormField key={target.name} id={target.name} label={label}><Input id={target.name} name={target.name} required min={target.allowZero ? '0' : '0.01'} step={target.integer ? '1' : '0.1'} type="number" inputMode={target.integer ? 'numeric' : 'decimal'} placeholder={target.placeholder} /></FormField>; })}</div></OnboardingStep>
    <Card className="border-primary/20 bg-primary/5"><CardContent className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">4</span><div><h2 className="font-bold">Review and continue</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Submitting saves your profile and active targets together, then opens Today. These values support planning and are not medical advice.</p></div></CardContent></Card>
    <SubmitButton className="w-full sm:w-fit sm:min-w-52" pendingLabel="Completing setup…">Complete setup</SubmitButton>
  </form>;
}

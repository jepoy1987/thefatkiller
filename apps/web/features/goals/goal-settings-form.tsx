'use client';

import { useState } from 'react';
import type { ActivityLevel, GoalType, UnitSystem } from '@tfk/types';
import { waterFromMilliliters, waterToMilliliters, weightFromKilograms, weightToKilograms } from '@tfk/validation';
import { SubmitButton } from '../../components/forms/submit-button';
import { FormField, Input, Select } from '../../components/ui/form';
import { updateGoalSettings } from '../../server/actions/goals';
import { activityOptions, goalTypeOptions, unitOptions } from './options';
import { numericInputProps } from './numeric-input';

type Props = { profileUnits: UnitSystem; goal: { goal_type: GoalType; goal_weight: number; activity_level: ActivityLevel; daily_calorie_target: number; daily_protein_target: number; daily_carbs_target: number; daily_fat_target: number; daily_water_target: number; daily_step_target: number } };

export function GoalSettingsForm({ profileUnits, goal }: Props) {
  const [display, setDisplay] = useState({ units: profileUnits, goalWeight: weightFromKilograms(goal.goal_weight, profileUnits), water: waterFromMilliliters(goal.daily_water_target, profileUnits) });
  const changeUnits = (next: UnitSystem) => setDisplay((current) => next === current.units ? current : {
    units: next,
    goalWeight: weightFromKilograms(weightToKilograms(current.goalWeight, current.units), next),
    water: waterFromMilliliters(waterToMilliliters(current.water, current.units), next),
  });
  const numericFields = [
    { name: 'daily_calorie_target', label: 'Calories', current: goal.daily_calorie_target, integer: true, allowZero: false },
    { name: 'daily_protein_target', label: 'Protein (g)', current: goal.daily_protein_target, integer: false, allowZero: true },
    { name: 'daily_carbs_target', label: 'Carbs (g)', current: goal.daily_carbs_target, integer: false, allowZero: true },
    { name: 'daily_fat_target', label: 'Fat (g)', current: goal.daily_fat_target, integer: false, allowZero: true },
    { name: 'daily_step_target', label: 'Steps', current: goal.daily_step_target, integer: true, allowZero: true },
  ] as const;
  return <form action={updateGoalSettings} className="grid gap-6"><section className="grid gap-5"><h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">Plan basics</h3><div className="grid gap-5 sm:grid-cols-2">
    <FormField id="goals-unit-system" label="Unit system" hint="Changing this converts weight and water before saving."><Select id="goals-unit-system" name="unit_system" value={display.units} onChange={(event) => changeUnits(event.target.value as UnitSystem)}>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
    <FormField id="goals-goal-type" label="Goal type"><Select id="goals-goal-type" name="goal_type" defaultValue={goal.goal_type}>{goalTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
    <FormField id="goals-goal-weight" label={`Goal weight (${display.units === 'imperial' ? 'lb' : 'kg'})`}><Input id="goals-goal-weight" name="goal_weight" type="number" value={display.goalWeight} onChange={(event) => setDisplay((current) => ({ ...current, goalWeight: Number(event.target.value) }))} {...numericInputProps(false, false)} /></FormField>
    <FormField id="goals-activity-level" label="Activity level"><Select id="goals-activity-level" name="activity_level" defaultValue={goal.activity_level}>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
  </div></section><section className="grid gap-5 border-t pt-6"><div><h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">Daily targets</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">These are planning inputs shown on Today.</p></div><div className="grid gap-5 sm:grid-cols-2">{numericFields.map((field) => <FormField key={field.name} id={`goals-${field.name}`} label={field.label}><Input id={`goals-${field.name}`} name={field.name} type="number" defaultValue={field.current} {...numericInputProps(field.integer, field.allowZero)} /></FormField>)}
    <FormField id="goals-daily-water-target" label={`Water (${display.units === 'imperial' ? 'fl oz' : 'ml'})`}><Input id="goals-daily-water-target" name="daily_water_target" type="number" value={display.water} onChange={(event) => setDisplay((current) => ({ ...current, water: Number(event.target.value) }))} {...numericInputProps(false, false)} /></FormField></div></section>
    <div className="border-t pt-5"><SubmitButton className="w-full sm:w-auto" pendingLabel="Saving goals…">Save goal settings</SubmitButton></div>
  </form>;
}

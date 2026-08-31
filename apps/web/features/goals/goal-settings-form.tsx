'use client';

import { useState } from 'react';
import type { ActivityLevel, GoalType, UnitSystem } from '@tfk/types';
import { waterFromMilliliters, waterToMilliliters, weightFromKilograms, weightToKilograms } from '@tfk/validation';
import { SubmitButton } from '../../components/forms/submit-button';
import { updateGoalSettings } from '../../server/actions/goals';
import { activityOptions, goalTypeOptions, unitOptions } from './options';

const fieldClass = 'rounded border border-slate-300 px-3 py-2';
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
  return <form action={updateGoalSettings} className="mt-6 grid gap-4">
    <label className="grid gap-1 text-sm">Unit system<select name="unit_system" value={display.units} onChange={(event) => changeUnits(event.target.value as UnitSystem)} className={fieldClass}>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Goal type<select name="goal_type" defaultValue={goal.goal_type} className={fieldClass}>{goalTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Goal weight ({display.units === 'imperial' ? 'lb' : 'kg'})<input name="goal_weight" type="number" min="0.01" step="0.1" value={display.goalWeight} onChange={(event) => setDisplay((current) => ({ ...current, goalWeight: Number(event.target.value) }))} className={fieldClass} /></label>
    <label className="grid gap-1 text-sm">Activity level<select name="activity_level" defaultValue={goal.activity_level} className={fieldClass}>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {numericFields.map((field) => <label key={field.name} className="grid gap-1 text-sm">{field.label}<input name={field.name} type="number" min={field.allowZero ? 0 : 0.01} step={field.integer ? 1 : 0.1} defaultValue={field.current} className={fieldClass} /></label>)}
    <label className="grid gap-1 text-sm">Water ({display.units === 'imperial' ? 'fl oz' : 'ml'})<input name="daily_water_target" type="number" min="0.01" step="0.1" value={display.water} onChange={(event) => setDisplay((current) => ({ ...current, water: Number(event.target.value) }))} className={fieldClass} /></label>
    <SubmitButton pendingLabel="Saving goals…">Save goal settings</SubmitButton>
  </form>;
}

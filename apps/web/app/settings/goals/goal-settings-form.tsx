'use client';

import { useState } from 'react';
import type { ActivityLevel, GoalType, UnitSystem } from '@tfk/types';
import { waterFromMilliliters, waterToMilliliters, weightFromKilograms, weightToKilograms } from '@tfk/validation';
import { updateGoalSettings } from '../../actions';

const field = 'rounded border border-slate-300 px-3 py-2';
type Props = { profileUnits: UnitSystem; goal: { goal_type: GoalType; goal_weight: number; activity_level: ActivityLevel; daily_calorie_target: number; daily_protein_target: number; daily_carbs_target: number; daily_fat_target: number; daily_water_target: number; daily_step_target: number } };

export function GoalSettingsForm({ profileUnits, goal }: Props) {
  const [units, setUnits] = useState(profileUnits);
  const [goalWeight, setGoalWeight] = useState(weightFromKilograms(goal.goal_weight, profileUnits));
  const [water, setWater] = useState(waterFromMilliliters(goal.daily_water_target, profileUnits));
  const changeUnits = (next: UnitSystem) => {
    if (next === units) return;
    setGoalWeight(weightFromKilograms(weightToKilograms(goalWeight, units), next));
    setWater(waterFromMilliliters(waterToMilliliters(water, units), next));
    setUnits(next);
  };
  const inputs: Array<[string, string, number]> = [['daily_calorie_target','Calories',goal.daily_calorie_target],['daily_protein_target','Protein (g)',goal.daily_protein_target],['daily_carbs_target','Carbs (g)',goal.daily_carbs_target],['daily_fat_target','Fat (g)',goal.daily_fat_target],['daily_step_target','Steps',goal.daily_step_target]];
  return <form action={updateGoalSettings} className="mt-6 grid gap-4">
    <label className="grid gap-1 text-sm">Unit system<select name="unit_system" value={units} onChange={(event) => changeUnits(event.target.value as UnitSystem)} className={field}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>
    <label className="grid gap-1 text-sm">Goal type<select name="goal_type" defaultValue={goal.goal_type} className={field}><option value="lose_weight">Lose weight</option><option value="maintain_weight">Maintain weight</option><option value="gain_weight">Gain weight</option></select></label>
    <label className="grid gap-1 text-sm">Goal weight ({units === 'imperial' ? 'lb' : 'kg'})<input name="goal_weight" type="number" min="0.01" step="0.1" value={goalWeight} onChange={(event) => setGoalWeight(Number(event.target.value))} className={field} /></label>
    <label className="grid gap-1 text-sm">Activity level<select name="activity_level" defaultValue={goal.activity_level} className={field}><option value="sedentary">Sedentary</option><option value="lightly_active">Lightly active</option><option value="moderately_active">Moderately active</option><option value="very_active">Very active</option><option value="extra_active">Extra active</option></select></label>
    {inputs.map(([name,label,current]) => <label key={name} className="grid gap-1 text-sm">{label}<input name={name} type="number" min={name === 'daily_step_target' ? 0 : 0.01} step={name === 'daily_step_target' || name === 'daily_calorie_target' ? 1 : 0.1} defaultValue={current} className={field} /></label>)}
    <label className="grid gap-1 text-sm">Water ({units === 'imperial' ? 'fl oz' : 'ml'})<input name="daily_water_target" type="number" min="0.01" step="0.1" value={water} onChange={(event) => setWater(Number(event.target.value))} className={field} /></label>
    <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Save goal settings</button>
  </form>;
}

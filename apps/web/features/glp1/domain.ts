import type { GLP1DoseLog, GLP1MedicationProfile, GLP1SymptomIntensity } from '@tfk/types';

export const appetiteScale = ['Very low', 'Low', 'Moderate', 'High', 'Very high'] as const;
export const symptomScale = ['None/minimal', 'Mild', 'Moderate', 'Strong', 'Severe'] as const;
export const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function symptomLabel(value: GLP1SymptomIntensity | number | null, appetite = false) {
  if (value == null || value < 1 || value > 5) return 'Not recorded';
  return `${(appetite ? appetiteScale : symptomScale)[value - 1]} (${value})`;
}

export function medicationLabel(profile: Pick<GLP1MedicationProfile, 'medication_name' | 'custom_medication_name'>) {
  if (profile.medication_name === 'other') return profile.custom_medication_name ?? 'Other';
  return profile.medication_name[0]!.toUpperCase() + profile.medication_name.slice(1);
}

export function doseSummary(log: Pick<GLP1DoseLog, 'event_type' | 'dose_amount' | 'dose_unit'>) {
  if (log.event_type !== 'taken') return log.event_type[0]!.toUpperCase() + log.event_type.slice(1);
  return `${log.dose_amount} ${log.dose_unit}`;
}

export function localDateTimeInput(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function journalDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

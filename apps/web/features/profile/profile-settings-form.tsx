import type { Profile } from '@tfk/types';
import { SubmitButton } from '../../components/forms/submit-button';
import { FormField, Input, Select } from '../../components/ui/form';
import { updateProfile } from '../../server/actions/profile';
import { unitOptions } from '../goals/options';

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  return <form action={updateProfile} className="grid gap-5">
    <div className="grid gap-5 sm:grid-cols-2"><FormField id="profile-first-name" label="First name"><Input id="profile-first-name" name="first_name" autoComplete="given-name" defaultValue={profile.first_name ?? ''} /></FormField><FormField id="profile-last-name" label="Last name"><Input id="profile-last-name" name="last_name" autoComplete="family-name" defaultValue={profile.last_name ?? ''} /></FormField></div>
    <FormField id="profile-display-name" label="Display name" hint="Used in your dashboard greeting."><Input id="profile-display-name" name="display_name" autoComplete="nickname" defaultValue={profile.display_name ?? ''} /></FormField>
    <div className="grid gap-5 sm:grid-cols-2"><FormField id="profile-date-of-birth" label="Date of birth"><Input id="profile-date-of-birth" name="date_of_birth" defaultValue={profile.date_of_birth ?? ''} type="date" /></FormField><FormField id="profile-unit-system" label="Unit system" hint="Affects how weights and targets are displayed."><Select id="profile-unit-system" name="unit_system" defaultValue={profile.unit_system}>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField></div>
    <div className="border-t pt-5"><SubmitButton className="w-full sm:w-auto" pendingLabel="Saving profile…">Save changes</SubmitButton></div>
  </form>;
}

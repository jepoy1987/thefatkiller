import type { Profile } from '@tfk/types';
import { SubmitButton } from '../../components/forms/submit-button';
import { updateProfile } from '../../server/actions/profile';
import { unitOptions } from '../goals/options';

const fieldClass = 'rounded border px-3 py-2';

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  return <form action={updateProfile} className="mt-6 grid gap-4">
    <input aria-label="First name" name="first_name" defaultValue={profile.first_name ?? ''} className={fieldClass} placeholder="First name" />
    <input aria-label="Last name" name="last_name" defaultValue={profile.last_name ?? ''} className={fieldClass} placeholder="Last name" />
    <input aria-label="Display name" name="display_name" defaultValue={profile.display_name ?? ''} className={fieldClass} placeholder="Display name" />
    <label className="grid gap-1 text-sm">Date of birth<input name="date_of_birth" defaultValue={profile.date_of_birth ?? ''} className={fieldClass} type="date" /></label>
    <label className="grid gap-1 text-sm">Unit system<select name="unit_system" defaultValue={profile.unit_system} className={fieldClass}>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <SubmitButton pendingLabel="Saving profile…">Save changes</SubmitButton>
  </form>;
}

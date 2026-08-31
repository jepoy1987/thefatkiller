'use client';

import { useState } from 'react';
import type { UnitSystem } from '@tfk/types';
import { SubmitButton } from '../../components/forms/submit-button';
import { Input, Select } from '../../components/ui/form';
import { uploadProgressPhoto } from '../../server/actions/progress';

export function PhotoUploadForm({ units, defaultRecordedAt }: { units: UnitSystem; defaultRecordedAt: string }) {
  const [filename, setFilename] = useState('No file selected');
  return <form action={uploadProgressPhoto} className="grid gap-3 sm:grid-cols-3">
    <input type="hidden" name="unit_system" value={units} />
    <div className="grid gap-1"><Input aria-label="Photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFilename(event.target.files?.[0]?.name ?? 'No file selected')} /><p className="truncate text-xs text-muted-foreground" aria-live="polite">{filename}</p></div>
    <Select aria-label="Photo type" name="photo_type">{['front', 'side', 'back', 'other'].map((type) => <option key={type}>{type}</option>)}</Select>
    <Input aria-label="Recorded at" name="recorded_at" type="datetime-local" defaultValue={defaultRecordedAt} required />
    <Input aria-label="Optional weight" name="weight" type="number" step="any" min="0.01" />
    <Input aria-label="Notes" name="notes" maxLength={500} />
    <SubmitButton pendingLabel="Uploading…">Upload photo</SubmitButton>
  </form>;
}

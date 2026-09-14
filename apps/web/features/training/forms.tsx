'use client';

import type { ReactNode } from 'react';
import { useFormState } from 'react-dom';
import { SubmitButton } from '../../components/forms/submit-button';
import { Alert } from '../../components/ui/alert';
import type { TrainingActionState } from '../../server/actions/training';

export type TrainingAction = (state: TrainingActionState, data: FormData) => Promise<TrainingActionState>;
export function ActionForm({ action, payload, children, label, pendingLabel = 'Saving…', variant = 'primary', onDirty, onSaved, disabled = false }: { action: TrainingAction; payload?: unknown; children?: ReactNode; label: string; pendingLabel?: string; variant?: 'primary' | 'outline' | 'danger'; onDirty?: () => void; onSaved?: () => void; disabled?: boolean }) {
  const [state, formAction] = useFormState(async (previous: TrainingActionState, data: FormData) => { const result = await action(previous, data); if (!result.error) onSaved?.(); return result; }, {});
  return <form action={formAction} onChange={onDirty} className="grid gap-3">
    {payload !== undefined ? <input type="hidden" name="payload" value={JSON.stringify(payload)} /> : null}
    {children}
    {state.error ? <Alert variant="error">{state.error}</Alert> : null}
    {state.message ? <p role="status" className="text-sm text-primary">{state.message}</p> : null}
    <fieldset disabled={disabled}><SubmitButton size="sm" variant={variant} pendingLabel={pendingLabel} className="w-fit">{label}</SubmitButton></fieldset>
  </form>;
}

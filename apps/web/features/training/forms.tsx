'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { newRequestKey } from '../../components/forms/request-key';
import { useFormState } from 'react-dom';
import { SubmitButton } from '../../components/forms/submit-button';
import { Alert } from '../../components/ui/alert';
import type { TrainingActionState } from '../../server/actions/training';

export type TrainingAction = (state: TrainingActionState, data: FormData) => Promise<TrainingActionState>;
export function ActionForm({ action, payload, children, label, pendingLabel = 'Saving…', variant = 'primary', onDirty, onClean, onSaved, disabled = false }: { action: TrainingAction; payload?: unknown; children?: ReactNode; label: string; pendingLabel?: string; variant?: 'primary' | 'outline' | 'danger'; onDirty?: () => void; onClean?: () => void; onSaved?: () => void; disabled?: boolean }) {
  const [requestKey, setRequestKey] = useState('');
  useEffect(() => setRequestKey(newRequestKey()), []);
  const [state, formAction] = useFormState(async (previous: TrainingActionState, data: FormData) => { const result = await action(previous, data); if (!result.error) { setRequestKey(newRequestKey()); onSaved?.(); } return result; }, {});
  return <form action={formAction} onChange={event => {
    const changed = Array.from(event.currentTarget.elements).some(element => {
      if (element instanceof HTMLInputElement && element.type !== 'hidden') return element.type === 'checkbox' ? element.checked !== element.defaultChecked : element.value !== element.defaultValue;
      return false;
    });
    if (changed) onDirty?.(); else onClean?.();
  }} className="grid gap-3">
    <input type="hidden" name="request_key" value={requestKey} />
    {payload !== undefined ? <input type="hidden" name="payload" value={JSON.stringify(payload)} /> : null}
    {children}
    {state.error ? <Alert variant="error">{state.error}</Alert> : null}
    {state.message ? <p role="status" className="text-sm text-primary">{state.message}</p> : null}
    <fieldset disabled={disabled || !requestKey}><SubmitButton size="sm" variant={variant} pendingLabel={pendingLabel} className="w-fit">{label}</SubmitButton></fieldset>
  </form>;
}

'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonStyles } from '../ui/button';

export function SubmitButton({ children, className, pendingLabel = 'Saving…', variant = 'primary', size = 'lg' }: { children: ReactNode; className?: string; pendingLabel?: string; variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  const { pending } = useFormStatus();
  return <button className={buttonStyles({ variant, size, className })} type="submit" disabled={pending} aria-disabled={pending} aria-live="polite">{pending ? <><span className="size-2 animate-pulse rounded-full bg-current" aria-hidden="true" />{pendingLabel}</> : children}</button>;
}

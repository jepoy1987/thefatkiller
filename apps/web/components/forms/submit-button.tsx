'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonStyles } from '../ui/button';

export function SubmitButton({ children, className, pendingLabel = 'Saving…' }: { children: ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button className={buttonStyles({ size: 'lg', className })} type="submit" disabled={pending} aria-disabled={pending}>{pending ? <><span className="size-2 animate-pulse rounded-full bg-current" aria-hidden="true" />{pendingLabel}</> : children}</button>;
}

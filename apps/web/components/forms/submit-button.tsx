'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, className = 'rounded bg-slate-900 px-4 py-2 text-white', pendingLabel = 'Saving…' }: { children: ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingLabel : children}</button>;
}

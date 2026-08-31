import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export function Alert({ children, variant = 'info' }: { children: ReactNode; variant?: 'info' | 'success' | 'warning' | 'error' }) {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={clsx('rounded-lg border px-4 py-3 text-sm leading-6', {
    'border-primary/20 bg-primary/5 text-foreground': variant === 'info',
    'border-success/20 bg-success/10 text-success': variant === 'success',
    'border-warning/30 bg-warning/10 text-foreground': variant === 'warning',
    'border-destructive/20 bg-destructive/10 text-destructive': variant === 'error',
  })}>{children}</div>;
}

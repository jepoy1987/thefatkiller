import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-xl border bg-card shadow-card', className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return <div className={clsx('flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6', className)}><div><h2 className="text-base font-bold tracking-tight">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}</div>{action}</div>;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-5 sm:p-6', className)} {...props} />;
}

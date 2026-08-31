import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed bg-muted/35 px-5 py-8 text-center"><div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-card text-lg text-primary shadow-sm" aria-hidden="true">+</div><h3 className="font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

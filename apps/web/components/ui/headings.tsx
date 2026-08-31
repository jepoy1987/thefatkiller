import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl">{eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}<h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl">{title}</h1>{description ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}</div>{action}</header>;
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return <div><h2 className="text-lg font-bold tracking-tight">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}</div>;
}

import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_68%)]" aria-hidden="true" />
    <div className="relative w-full max-w-md"><Link href="/login" className="mx-auto mb-7 flex w-fit items-center gap-3 rounded-lg focus-visible:ring-4 focus-visible:ring-primary/20"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">TFK</span><span className="font-black tracking-[-0.025em]">The Fat Killer</span></Link>
      <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-7">{children}</div><div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">{footer}</div></div>
      <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Focused daily planning for sustainable progress. Planning guidance is not medical advice.</p>
    </div>
  </main>;
}

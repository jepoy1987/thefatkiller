import Link from 'next/link';
import type { ReactNode } from 'react';
import { logout } from '../../server/actions/auth';
import { buttonStyles } from '../ui/button';

type ActiveSection = 'today' | 'progress' | 'settings';
const navigation = [
  { label: 'Today', href: '/dashboard', mark: 'T', key: 'today' },
  { label: 'Progress', href: '/progress', mark: 'P', key: 'progress' },
  { label: 'Nutrition', href: null, mark: 'N', key: 'nutrition' },
  { label: 'Check-Ins', href: null, mark: 'C', key: 'check-ins' },
  { label: 'Reports', href: null, mark: 'R', key: 'reports' },
] as const;

function Brand() { return <Link href="/dashboard" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-black tracking-tight text-primary-foreground">TFK</span><span><span className="block text-sm font-black tracking-[-0.02em]">The Fat Killer</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily clarity</span></span></Link>; }
function DesktopNavigation({ active }: { active: ActiveSection }) { return <nav aria-label="Primary" className="mt-10 grid gap-1">{navigation.map((item) => item.href ? <Link key={item.label} href={item.href} aria-current={active === item.key ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active === item.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><span className="flex size-7 items-center justify-center rounded-md border bg-card text-xs" aria-hidden="true">{item.mark}</span>{item.label}</Link> : <span key={item.label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground/55"><span className="flex size-7 items-center justify-center rounded-md border text-xs" aria-hidden="true">{item.mark}</span>{item.label}<span className="ml-auto text-[9px] uppercase tracking-wider">Soon</span></span>)}</nav>; }

export function AppShell({ children, active }: { children: ReactNode; active: ActiveSection }) {
  return <div className="min-h-screen bg-background lg:grid lg:grid-cols-[248px_minmax(0,1fr)]"><aside className="hidden border-r bg-card px-5 py-6 lg:fixed lg:inset-y-0 lg:flex lg:w-[248px] lg:flex-col"><Brand /><DesktopNavigation active={active} /><div className="mt-auto grid gap-2 border-t pt-5"><Link href="/settings/profile" aria-current={active === 'settings' ? 'page' : undefined} className={buttonStyles({ variant: active === 'settings' ? 'outline' : 'ghost', className: 'justify-start' })}>Settings</Link><form action={logout}><button type="submit" className={buttonStyles({ variant: 'ghost', className: 'w-full justify-start' })}>Log out</button></form></div></aside><div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-20 border-b bg-card/95 px-4 py-3 backdrop-blur lg:hidden"><div className="flex items-center justify-between gap-3"><Brand /><Link href="/settings/profile" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>Settings</Link></div><nav aria-label="Mobile primary" className="mt-3 flex gap-2 overflow-x-auto pb-1">{navigation.map((item) => item.href ? <Link key={item.label} href={item.href} className={buttonStyles({ variant: active === item.key ? 'primary' : 'outline', size: 'sm', className: 'shrink-0' })}>{item.label}</Link> : <span key={item.label} aria-disabled="true" className="inline-flex h-9 shrink-0 cursor-not-allowed items-center rounded-lg border px-3 text-sm font-semibold text-muted-foreground/55">{item.label}</span>)}</nav></header><main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-10 xl:px-12">{children}</main></div></div>;
}

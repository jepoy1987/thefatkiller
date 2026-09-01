import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell } from './app-shell';

const links = [{ key: 'profile', label: 'Profile', href: '/settings/profile' }, { key: 'goals', label: 'Goals & targets', href: '/settings/goals' }, { key: 'billing', label: 'Billing', href: '/settings/billing' }] as const;

export function SettingsShell({ active, children }: { active: 'profile' | 'goals' | 'billing'; children: ReactNode }) {
  return <AppShell active="settings"><div className="grid gap-7"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Account</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Keep your identity, targets, and plan details up to date.</p></header><div className="grid gap-7 lg:grid-cols-[190px_minmax(0,1fr)]"><nav aria-label="Settings" className="flex gap-2 overflow-x-auto lg:grid lg:content-start">{links.map((link)=><Link key={link.key} href={link.href} aria-current={active === link.key ? 'page' : undefined} className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${active === link.key ? 'bg-secondary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{link.label}</Link>)}</nav><div className="min-w-0">{children}</div></div></div></AppShell>;
}

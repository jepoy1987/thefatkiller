import type { ReactNode } from 'react';
import { Card } from './card';

export function StatCard({ label, value, helper, accent }: { label: string; value: string; helper?: string; accent?: ReactNode }) {
  return <Card className="overflow-hidden p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-muted-foreground">{label}</p>{accent}</div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full w-0 rounded-full bg-primary" /></div>{helper ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p> : null}</Card>;
}

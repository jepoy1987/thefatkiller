import Link from 'next/link';
import { AppShell } from '../../components/layout/app-shell';
import { Alert } from '../../components/ui/alert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/headings';
import { MeasurementSection, MilestonesSection, PhotosSection, SummaryCards, WeightChart, WeightSection } from '../../features/progress/components';
import { getProgressFoundation } from '../../lib/data/progress';
export default async function ProgressPage(props: { searchParams: Promise<{ error?: string; message?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const data = await getProgressFoundation(Math.max(1, Math.min(10000, Number.parseInt(searchParams.page ?? '1', 10) || 1)));return <AppShell active="progress"><div className="grid gap-6"><PageHeader eyebrow="Progress" title="See the trend, not just the number" description="Track weight, measurements, private photos, and milestones."/>{searchParams.error&&<Alert variant="error">{searchParams.error}</Alert>}{searchParams.message&&<Alert variant="success">{searchParams.message}</Alert>}<SummaryCards summary={data.summary}/><Card><CardHeader title="Weight trend" description="Your 12 most recent entries."/><CardContent><WeightChart entries={data.chartWeights} units={data.profile.unit_system}/></CardContent></Card><WeightSection entries={data.weights} units={data.profile.unit_system}/><MeasurementSection entries={data.measurements} units={data.profile.unit_system}/><PhotosSection photos={data.photos} units={data.profile.unit_system}/><nav aria-label="Progress history pages" className="flex items-center gap-4">{data.page > 1 && <Link href={`/progress?page=${data.page-1}`} className="underline">Newer history</Link>}<span>History page {data.page}</span>{data.hasMore && <Link href={`/progress?page=${data.page+1}`} className="underline">Older history</Link>}</nav><MilestonesSection milestones={data.milestones}/></div></AppShell>;
}

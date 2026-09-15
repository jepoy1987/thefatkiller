import { ReportsPage } from '../../features/reports/page';
export default async function Page(props:{searchParams:Promise<Record<string,string|undefined>>}) {
  const searchParams = await props.searchParams;
  return <ReportsPage query={searchParams}/>;
}

import { ReportsPage } from '../../../../../features/reports/page';
export default async function Page(
  props:{params: Promise<{clientId:string}>;searchParams:Promise<Record<string,string|undefined>>}
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  return <ReportsPage query={searchParams} clientId={params.clientId}/>;
}

import { ReportsPage } from '../../../../../features/reports/page';
export default function Page({params,searchParams}:{params:{clientId:string};searchParams:Record<string,string|undefined>}){return <ReportsPage query={searchParams} clientId={params.clientId}/>;}

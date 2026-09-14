import { ReportsPage } from '../../features/reports/page';
export default function Page({searchParams}:{searchParams:Record<string,string|undefined>}){return <ReportsPage query={searchParams}/>;}

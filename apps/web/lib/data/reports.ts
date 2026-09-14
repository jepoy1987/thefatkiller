import 'server-only';
import { hasFeature } from '@tfk/access';
import type { ReportContext, ReportSource } from '@tfk/types';
import { notFound } from 'next/navigation';
import { createClient } from './client';
import { requireUser } from './session';
import { getCurrentEntitlements } from './entitlements';
import { buildReport, resolveReportPeriod } from '../../features/reports/domain';

export async function canUseReports() {
 const client=createClient();await requireUser(client);
 return hasFeature(await getCurrentEntitlements(client),'advanced_reports');
}
export async function getReport(query:Record<string,string|undefined>,clientId?:string) {
 const client=createClient();await requireUser(client);
 if(!hasFeature(await getCurrentEntitlements(client),'advanced_reports'))return {allowed:false,report:null,error:null,context:null};
 const args=clientId?{p_client_id:clientId}:{};
 const contextResult=await client.rpc('get_report_context',args);
 if(contextResult.error){if(clientId)notFound();throw new Error('Report context could not be loaded.');}
 const context=contextResult.data as unknown as ReportContext;
 let period;
 try{period=resolveReportPeriod(query,context);}catch{return {allowed:true,report:null,error:'Choose 7, 30 or 90 days, or a valid custom range of up to 365 days ending no later than today.',context};}
 const result=await client.rpc('get_report_data',{...args,p_start:period.start,p_end:period.end});
 if(result.error){if(result.error.code==='42501')notFound();throw new Error('Report data could not be loaded.');}
 return {allowed:true,report:buildReport(result.data as unknown as ReportSource,period),error:null,context};
}

import { timingSafeEqual } from 'node:crypto';
type CleanupRow={id:string;user_id:string;attempts:number;storage_path:string|null;cleanup_claim:string;expires_at:string};
export function cleanupAuthorized(header:string|null,secret:string|undefined){
 if(!secret||secret.length<32||!header)return false;
 const a=Buffer.from(header),b=Buffer.from(`Bearer ${secret}`);return a.length===b.length&&timingSafeEqual(a,b);
}
/** No logging of paths, credentials, photos or model output. Only bounded counts. */
export async function cleanupFoodPhotoBatch(config:{url:string;key:string;limit?:number},fetcher:typeof fetch=fetch){
 const limit=config.limit??20;if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid batch size');
 const base=new URL(config.url);if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw new Error('Invalid cleanup endpoint');
 const headers={apikey:config.key,Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'};
 const call=async(path:string,body:unknown,method='POST')=>{
  const r=await fetcher(new URL(path,base),{method,headers,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error('Cleanup request failed');return r.json();
 };
 const rows:CleanupRow[]=await call('/rest/v1/rpc/claim_food_photo_cleanup',{p_limit:limit});
 if(!Array.isArray(rows)||rows.length>limit)throw new Error('Invalid cleanup batch');
 let cleared=0,failed=0;const deadline=Date.now()+35000;
 // Four concurrent operations; expired row leases prevent overlapping workers from claiming twice.
 let next=0;
 await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{
  while(next<rows.length){const row=rows[next++];try{
   const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   if(Date.now()>deadline||!uuid.test(row.id)||!uuid.test(row.user_id)||!uuid.test(row.cleanup_claim)||!Number.isInteger(row.attempts)||row.attempts<1||row.attempts>3||!Number.isFinite(Date.parse(row.expires_at))||Date.parse(row.expires_at)>Date.now())throw new Error('Unsafe cleanup row');
   const expected=`${row.user_id}/${row.id}-${row.attempts}.jpg`;
   if(row.storage_path!==null&&row.storage_path!==expected)throw new Error('Unsafe cleanup path');
   if(row.storage_path){
    // Storage remove is idempotent, including an empty returned list for missing objects.
    await call('/storage/v1/object/food-analysis',{prefixes:[row.storage_path]},'DELETE');
   }
   const done=await call('/rest/v1/rpc/complete_food_photo_cleanup',{p_id:row.id,p_user_id:row.user_id,p_claim:row.cleanup_claim,p_path:row.storage_path});
   if(done!==true)throw new Error('Cleanup acknowledgement rejected');cleared++;
  }catch{failed++;}}
 }));
 return {examined:rows.length,cleared,failed};
}

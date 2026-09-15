/** Trusted worker only. No raw paths, identities or credentials are logged. */
export async function processAccountDeletions(config: { url: string; key: string }, fetcher: typeof fetch = fetch) {
  const base = new URL(config.url);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname))) throw new Error('Invalid worker endpoint');
  const headers = { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type':'application/json' };
  const call = async (path: string, body?: unknown, method = 'POST') => {
    const r = await fetcher(new URL(path, base), {method,headers,body:body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    if (!r.ok) throw new Error('Account cleanup request failed');
    return r.status === 204 ? null : r.json();
  };
  const claims: {user_id:string;lease:string}[] = await call('/rest/v1/rpc/claim_account_deletions',{p_limit:1});
  if (!Array.isArray(claims) || claims.length > 1) throw new Error('Invalid deletion batch');
  let completed=0, pending=0, failed=0;
  for (const claim of claims) {
    try {
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(!uuid.test(claim.user_id)||!uuid.test(claim.lease)) throw new Error('Invalid claim');
      const args={p_user_id:claim.user_id,p_lease:claim.lease};
      const rows: {bucket_id:string;name:string}[]=await call('/rest/v1/rpc/account_deletion_objects',args);
      if(!Array.isArray(rows)||rows.length>100) throw new Error('Invalid object batch');
      for(const row of rows) if(!['progress-photos','food-analysis'].includes(row.bucket_id)||!row.name.startsWith(`${claim.user_id}/`)||row.name.split('/').some(p=>p==='..'||p==='.'||!p)) throw new Error('Unsafe object path');
      for(const bucket of ['progress-photos','food-analysis']) {
        const paths=rows.filter(r=>r.bucket_id===bucket).map(r=>r.name);
        if(paths.length) await call(`/storage/v1/object/${bucket}`,{prefixes:paths},'DELETE');
      }
      if(await call('/rest/v1/rpc/account_deletion_ready',args)!==true){pending++;continue;}
      if(await call('/rest/v1/rpc/prepare_account_deletion',args)!==true){pending++;continue;}
      // Admin deletion only after bytes are gone. Cascades remove the queue too.
      await call(`/auth/v1/admin/users/${claim.user_id}`,undefined,'DELETE');
      completed++;
    } catch {failed++;}
  }
  return {examined:claims.length,completed,pending,failed};
}

/** Fixed operation names and bounded metadata only: no query, payload or identity. */
export function logDataFailure(operation: 'latest_weight' | 'food_photo_cleanup', code?: string) {
  console.error(JSON.stringify({ event: 'data_failure', operation, code: code && /^[A-Z0-9]{3,12}$/.test(code) ? code : 'unknown' }));
}

export const observedSupabaseFetch: typeof fetch = async (input, init) => {
  const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname;
  const match = /^\/(rest\/v1\/(?:rpc\/)?[a-z_]+|auth\/v1\/user)$/.exec(path);
  const operation = match?.[1] ?? 'supabase_other';
  const started = performance.now();
  try {
    const response = await fetch(input, init);
    if (!response.ok || process.env.TFK_PERFORMANCE_LOGS === '1') console.info(JSON.stringify({ event: 'data_request', operation, status: response.status, duration_ms: Math.round(performance.now() - started) }));
    return response;
  } catch {
    console.error(JSON.stringify({ event: 'data_request', operation, status: 0, duration_ms: Math.round(performance.now() - started) }));
    throw new Error('Data service unavailable');
  }
};

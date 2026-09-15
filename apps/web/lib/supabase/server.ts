import { createServerClient } from '@supabase/ssr';
import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { observedSupabaseFetch } from '../../server/observability';

export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: observedSupabaseFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot write cookies. Middleware refreshes them. */ }
      },
    },
  });
});

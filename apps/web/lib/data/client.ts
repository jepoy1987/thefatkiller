import { createClient } from '../supabase/server';

export type WebSupabaseClient = Awaited<ReturnType<typeof createClient>>;
export { createClient };

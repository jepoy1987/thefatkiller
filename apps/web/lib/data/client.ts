import { createClient } from '../supabase/server';

export type WebSupabaseClient = ReturnType<typeof createClient>;
export { createClient };

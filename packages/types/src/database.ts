// Generated-file shape checked in so consumers typecheck before a local project exists.
// Regenerate with `pnpm db:types` after `supabase start`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; first_name: string | null; last_name: string | null; display_name: string | null; avatar_url: string | null; date_of_birth: string | null; sex: string | null; timezone: string; locale: string; unit_system: 'metric' | 'imperial'; onboarding_completed: boolean; created_at: string; updated_at: string };
        Insert: { id: string; first_name?: string | null; last_name?: string | null; display_name?: string | null; avatar_url?: string | null; date_of_birth?: string | null; sex?: string | null; timezone?: string; locale?: string; unit_system?: 'metric' | 'imperial'; onboarding_completed?: boolean; created_at?: string; updated_at?: string };
        Update: { first_name?: string | null; last_name?: string | null; display_name?: string | null; avatar_url?: string | null; date_of_birth?: string | null; sex?: string | null; timezone?: string; locale?: string; unit_system?: 'metric' | 'imperial'; onboarding_completed?: boolean };
        Relationships: [];
      };
      user_roles: {
        Row: { user_id: string; role: 'user' | 'coach' | 'admin'; created_at: string; updated_at: string };
        Insert: { user_id: string; role?: 'user' | 'coach' | 'admin'; created_at?: string; updated_at?: string };
        Update: { role?: 'user' | 'coach' | 'admin' };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { app_role: 'user' | 'coach' | 'admin'; unit_system: 'metric' | 'imperial' };
    CompositeTypes: Record<string, never>;
  };
};

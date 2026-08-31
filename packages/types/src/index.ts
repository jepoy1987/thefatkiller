export type UnitSystem = 'metric' | 'imperial';
export type AppRole = 'user' | 'coach' | 'admin';

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  sex: string | null;
  timezone: string;
  locale: string;
  unit_system: UnitSystem;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRole = { user_id: string; role: AppRole; created_at: string; updated_at: string };
export type { Database } from './database';

export type AuthUser = {
  id: string;
  email: string | null;
  created_at: string;
};

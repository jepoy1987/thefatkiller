export type UnitSystem = 'metric' | 'imperial';
export type AppRole = 'user' | 'coach' | 'admin';
export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

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
export type UserGoal = {
  id: string; user_id: string; goal_type: GoalType;
  starting_weight: number; goal_weight: number; height: number;
  activity_level: ActivityLevel; daily_calorie_target: number;
  daily_protein_target: number; daily_carbs_target: number; daily_fat_target: number;
  daily_water_target: number; daily_step_target: number; is_active: boolean;
  created_at: string; updated_at: string;
};

export type DashboardTarget = {
  key: 'calories' | 'protein' | 'carbs' | 'fat' | 'water' | 'steps';
  label: string;
  current: number;
  target: number;
  unit: string | null;
};

export type TodayDashboardData = {
  profile: Profile;
  goal: UserGoal;
  welcomeName: string;
  targets: DashboardTarget[];
  weightGoal: {
    starting: number;
    target: number;
    unit: string;
  };
  nextActions: string[];
};
export type { Database } from './database';

export type AuthUser = {
  id: string;
  email: string | null;
  created_at: string;
};

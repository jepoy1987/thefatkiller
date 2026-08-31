export type UnitSystem = 'metric' | 'imperial';
export type AppRole = 'user' | 'coach' | 'admin';
export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type ProgressSource = 'manual' | 'import' | 'apple_health' | 'health_connect' | 'coach';
export type MeasurementType = 'waist' | 'hips' | 'chest' | 'neck' | 'left_arm' | 'right_arm' | 'left_thigh' | 'right_thigh' | 'body_fat';
export type ProgressPhotoType = 'front' | 'side' | 'back' | 'other';
export type MilestoneType = 'first_weight' | 'five_weights' | 'goal_reached';

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
export type WeightEntry = { id: string; user_id: string; weight_kg: number; recorded_at: string; source: ProgressSource; notes: string | null; created_at: string; updated_at: string };
export type BodyMeasurement = { id: string; user_id: string; measurement_type: MeasurementType; value: number; recorded_at: string; notes: string | null; created_at: string; updated_at: string };
export type ProgressPhoto = { id: string; user_id: string; storage_path: string; photo_type: ProgressPhotoType; recorded_at: string; weight_kg: number | null; notes: string | null; created_at: string; signed_url?: string };
export type Milestone = { id: string; user_id: string; milestone_type: MilestoneType; achieved_at: string; created_at: string };
export type ProgressSummary = { current: number; starting: number; goal: number; change: number; remaining: number; percent: number; weeklyRate: number | null; trend: 'up' | 'down' | 'steady'; unit: string };

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
    current: number;
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

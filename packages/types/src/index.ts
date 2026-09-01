export type UnitSystem = 'metric' | 'imperial';
export type AppRole = 'user' | 'coach' | 'admin';
export type PlanCode = 'free' | 'premium' | 'coach';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'incomplete';
export type BillingProvider = 'internal' | 'stripe' | 'apple' | 'google' | 'manual';
export type FeatureCode = 'progress_tracking' | 'nutrition_tracking' | 'water_tracking' | 'habits' | 'daily_check_ins' | 'weekly_check_ins' | 'tfk_score' | 'progress_photos' | 'advanced_reports' | 'coach_access' | 'ai_insights' | 'glp1_journal' | 'workouts';
export type EntitlementLimits = Record<string, number | string | boolean | null>;
export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type ProgressSource = 'manual' | 'import' | 'apple_health' | 'health_connect' | 'coach';
export type MeasurementType = 'waist' | 'hips' | 'chest' | 'neck' | 'left_arm' | 'right_arm' | 'left_thigh' | 'right_thigh' | 'body_fat';
export type ProgressPhotoType = 'front' | 'side' | 'back' | 'other';
export type MilestoneType = 'first_weight' | 'five_weights' | 'goal_reached';
export type FoodSource = 'manual' | 'system' | 'provider' | 'barcode';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ServingUnit = 'g' | 'ml' | 'oz' | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'serving' | 'other';

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
export type Plan = { id: string; code: PlanCode; name: string; description: string | null; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
export type Feature = { id: string; code: FeatureCode; name: string; description: string | null; created_at: string };
export type PlanEntitlement = { id: string; plan_id: string; feature_id: string; enabled: boolean; limits: EntitlementLimits; created_at: string };
export type UserSubscription = { id: string; user_id: string; plan_id: string; status: SubscriptionStatus; provider: BillingProvider; provider_customer_id: string | null; provider_subscription_id: string | null; current_period_start: string | null; current_period_end: string | null; cancel_at_period_end: boolean; trial_ends_at: string | null; created_at: string; updated_at: string };
export type EntitlementSet = { plan: { code: PlanCode; name: string }; subscriptionStatus: SubscriptionStatus | null; provider: BillingProvider | null; features: FeatureCode[]; limits: Partial<Record<FeatureCode, EntitlementLimits>>; currentPeriodStart: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; trialEndsAt: string | null; isInternalTest: boolean };
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
export type Food = { id: string; owner_user_id: string | null; name: string; brand: string | null; source: FoodSource; external_id: string | null; serving_size: number; serving_unit: ServingUnit; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null; sugar_g: number | null; sodium_mg: number | null; is_favorite: boolean; created_at: string; updated_at: string };
export type FoodLog = { id: string; user_id: string; food_id: string | null; meal_type: MealType; food_name_snapshot: string; brand_snapshot: string | null; servings: number; serving_size_snapshot: number; serving_unit_snapshot: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null; logged_at: string; notes: string | null; created_at: string; updated_at: string };
export type SavedMeal = { id: string; user_id: string; name: string; description: string | null; created_at: string; updated_at: string; items?: SavedMealItem[] };
export type SavedMealItem = { id: string; saved_meal_id: string; food_id: string | null; food_name_snapshot: string; servings: number; serving_size_snapshot: number; serving_unit_snapshot: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; position: number; created_at: string };
export type WaterLog = { id: string; user_id: string; amount_ml: number; logged_at: string; created_at: string; updated_at: string };
export type NutrientTotals = { calories: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number };
export type DailyNutritionSummary = NutrientTotals & { date: string; targets: NutrientTotals; meals: Record<MealType, NutrientTotals> };
export type HabitCategory = 'nutrition' | 'hydration' | 'movement' | 'sleep' | 'mindset' | 'medication' | 'custom';
export type HabitFrequency = 'daily' | 'weekly';
export type Habit = { id: string; user_id: string; name: string; description: string | null; category: HabitCategory; frequency: HabitFrequency; target_per_period: number; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
export type HabitCompletion = { id: string; habit_id: string; user_id: string; completed_on: string; value: number | null; notes: string | null; created_at: string };
export type DailyCheckIn = { id: string; user_id: string; check_in_date: string; mood: number | null; energy: number | null; hunger: number | null; sleep_quality: number | null; stress: number | null; notes: string | null; win_of_day: string | null; challenge_of_day: string | null; created_at: string; updated_at: string };
export type WeeklyCheckIn = { id: string; user_id: string; week_start: string; overall_rating: number | null; nutrition_rating: number | null; movement_rating: number | null; sleep_rating: number | null; biggest_win: string | null; biggest_challenge: string | null; focus_next_week: string | null; notes: string | null; created_at: string; updated_at: string };
export type HabitStreak = { habit_id: string; current: number; longest: number; completion_rate: number };
export type TFKScoreBreakdown = { nutrition: number; hydration: number; habits: number; checkIns: number; progress: number };
export type TFKScore = { overall: number; label: 'Excellent' | 'Strong' | 'Building' | 'Inconsistent' | 'Needs attention'; breakdown: TFKScoreBreakdown; windowDays: number };
export type AccountabilitySummary = { today: string; weekStart: string; activeHabits: number; completedHabits: number; dailyCheckInComplete: boolean; streaks: HabitStreak[]; score: TFKScore };

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
  accountability?: AccountabilitySummary;
};
export type { Database } from './database';

export type AuthUser = {
  id: string;
  email: string | null;
  created_at: string;
};

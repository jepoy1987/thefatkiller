import { z } from 'zod';
export const coachGoalCategorySchema = z.enum(['nutrition','hydration','movement','sleep','mindset','progress','accountability','custom']);
export const coachGoalPrioritySchema = z.enum(['low','normal','high']);
export const coachGoalSchema = z.object({ client_id:z.string().uuid(), title:z.string().trim().min(3,'Use a meaningful goal title.').max(120), description:z.string().trim().max(1000).optional(), category:coachGoalCategorySchema, target_date:z.union([z.literal(''),z.string().date()]).optional(), priority:coachGoalPrioritySchema, client_visible:z.coerce.boolean().default(false) });
export const coachNoteSchema = z.object({ client_id:z.string().uuid(), note:z.string().trim().min(3,'Add a meaningful note.').max(2000), client_visible:z.coerce.boolean().default(false) });
export const coachingPrivacySchema = z.object({ share_progress:z.coerce.boolean(), share_nutrition:z.coerce.boolean(), share_accountability:z.coerce.boolean(), share_glp1_summary:z.coerce.boolean(), share_glp1_details:z.literal(false).default(false) });
import type { UnitSystem } from '@tfk/types';

const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;
const ML_PER_FL_OZ = 29.5735295625;
const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

export const weightToKilograms = (value: number, units: UnitSystem) => round(units === 'imperial' ? value * KG_PER_LB : value);
export const weightFromKilograms = (value: number, units: UnitSystem) => round(units === 'imperial' ? value / KG_PER_LB : value, 1);
export const heightToCentimeters = (value: number, units: UnitSystem) => round(units === 'imperial' ? value * CM_PER_INCH : value);
export const heightFromCentimeters = (value: number, units: UnitSystem) => round(units === 'imperial' ? value / CM_PER_INCH : value, 1);
export const waterToMilliliters = (value: number, units: UnitSystem) => Math.round(units === 'imperial' ? value * ML_PER_FL_OZ : value);
export const waterFromMilliliters = (value: number, units: UnitSystem) => round(units === 'imperial' ? value / ML_PER_FL_OZ : value, 1);
export const weightLabel = (units: UnitSystem) => units === 'imperial' ? 'lb' : 'kg';
export const heightLabel = (units: UnitSystem) => units === 'imperial' ? 'in' : 'cm';
export const waterLabel = (units: UnitSystem) => units === 'imperial' ? 'fl oz' : 'ml';

export const unitSystemSchema = z.enum(['metric', 'imperial']);
export const roleSchema = z.enum(['user', 'coach', 'admin']);
export const planCodeSchema = z.enum(['free', 'premium', 'coach']);
export const subscriptionStatusSchema = z.enum(['active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete']);
export const billingProviderSchema = z.enum(['internal', 'stripe', 'apple', 'google', 'manual']);
export const featureCodeSchema = z.enum(['progress_tracking', 'nutrition_tracking', 'water_tracking', 'habits', 'daily_check_ins', 'weekly_check_ins', 'tfk_score', 'progress_photos', 'advanced_reports', 'coach_access', 'ai_insights', 'glp1_journal', 'workouts']);
export const entitlementLimitsSchema = z.record(z.union([z.number().nonnegative(), z.string(), z.boolean(), z.null()]));
export const goalTypeSchema = z.enum(['lose_weight', 'maintain_weight', 'gain_weight']);
export const activityLevelSchema = z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']);
export const progressSourceSchema = z.enum(['manual', 'import', 'apple_health', 'health_connect', 'coach']);
export const measurementTypeSchema = z.enum(['waist', 'hips', 'chest', 'neck', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'body_fat']);
export const progressPhotoTypeSchema = z.enum(['front', 'side', 'back', 'other']);
export const weightEntrySchema = z.object({ id: z.string().uuid().optional(), weight: z.coerce.number().positive('Weight must be greater than zero.'), recorded_at: z.string().min(1), notes: z.string().max(500).optional() });
export const bodyMeasurementSchema = z.object({ id: z.string().uuid().optional(), measurement_type: measurementTypeSchema, value: z.coerce.number().nonnegative('Measurement cannot be negative.'), recorded_at: z.string().min(1), notes: z.string().max(500).optional() });
export const progressPhotoSchema = z.object({ photo_type: progressPhotoTypeSchema, recorded_at: z.string().min(1), weight: z.union([z.literal(''), z.coerce.number().positive()]).optional(), notes: z.string().max(500).optional() });
export const foodSourceSchema = z.enum(['manual', 'system', 'provider', 'barcode']);
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export const servingUnitSchema = z.enum(['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving', 'other']);
const nutritionNumber = z.coerce.number().nonnegative('Nutrition values cannot be negative.');
export const foodSchema = z.object({ name: z.string().trim().min(1, 'Food name is required.').max(120), brand: z.string().trim().max(120).optional(), serving_size: z.coerce.number().positive('Serving size must be greater than zero.'), serving_unit: servingUnitSchema, calories: nutritionNumber, protein_g: nutritionNumber, carbs_g: nutritionNumber, fat_g: nutritionNumber, fiber_g: z.union([z.literal(''), nutritionNumber]).optional() });
export const foodLogSchema = z.object({ food_id: z.string().uuid(), meal_type: mealTypeSchema, servings: z.coerce.number().positive('Servings must be greater than zero.'), logged_at: z.string().min(1, 'Log time is required.'), notes: z.string().max(500).optional() });
export const quickAddSchema = z.object({ name: z.string().trim().min(1, 'Description is required.').max(120), meal_type: mealTypeSchema, calories: nutritionNumber, protein_g: nutritionNumber.default(0), carbs_g: nutritionNumber.default(0), fat_g: nutritionNumber.default(0), logged_at: z.string().min(1), notes: z.string().max(500).optional() });
export const savedMealSchema = z.object({ name: z.string().trim().min(1, 'Meal name is required.').max(120), description: z.string().max(500).optional(), food_ids: z.array(z.string().uuid()).min(1, 'Choose at least one food.') });
export const savedMealDetailsSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1, 'Meal name is required.').max(120), description: z.string().max(500).optional() });
export const waterLogSchema = z.object({ amount: z.coerce.number().positive('Water amount must be greater than zero.'), unit_system: unitSystemSchema, logged_at: z.string().min(1) });
export const updateFoodLogSchema = z.object({ id: z.string().uuid(), meal_type: mealTypeSchema, servings: z.coerce.number().positive('Servings must be greater than zero.'), logged_at: z.string().min(1), notes: z.string().max(500).optional() });
export const habitCategorySchema = z.enum(['nutrition','hydration','movement','sleep','mindset','medication','custom']);
export const habitFrequencySchema = z.enum(['daily','weekly']);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.');
const ratingSchema = z.coerce.number().int().min(1, 'Choose a rating from 1 to 5.').max(5, 'Choose a rating from 1 to 5.');
const optionalRatingSchema = z.union([z.literal(''), ratingSchema]).optional();
export const habitSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1, 'Habit name is required.').max(120), description: z.string().trim().max(500).optional(), category: habitCategorySchema, frequency: habitFrequencySchema, target_per_period: z.coerce.number().int().min(1).max(100).default(1), sort_order: z.coerce.number().int().nonnegative().default(0) });
export const habitCompletionSchema = z.object({ habit_id: z.string().uuid(), completed_on: isoDateSchema, notes: z.string().trim().max(500).optional(), value: z.union([z.literal(''), z.coerce.number().nonnegative()]).optional() });
export const dailyCheckInSchema = z.object({ check_in_date: isoDateSchema, mood: optionalRatingSchema, energy: optionalRatingSchema, hunger: optionalRatingSchema, sleep_quality: optionalRatingSchema, stress: optionalRatingSchema, win_of_day: z.string().trim().max(500).optional(), challenge_of_day: z.string().trim().max(500).optional(), notes: z.string().trim().max(1000).optional() });
export const weeklyCheckInSchema = z.object({ week_start: isoDateSchema, overall_rating: optionalRatingSchema, nutrition_rating: optionalRatingSchema, movement_rating: optionalRatingSchema, sleep_rating: optionalRatingSchema, biggest_win: z.string().trim().max(500).optional(), biggest_challenge: z.string().trim().max(500).optional(), focus_next_week: z.string().trim().max(500).optional(), notes: z.string().trim().max(1000).optional() });
export const glp1MedicationSchema = z.enum(['semaglutide', 'tirzepatide', 'liraglutide', 'other']);
export const glp1ScheduleSchema = z.enum(['daily', 'weekly', 'other']);
export const glp1DoseEventTypeSchema = z.enum(['taken', 'missed', 'skipped']);
export const glp1DoseUnitSchema = z.enum(['mg', 'mcg', 'units', 'other']);
export const glp1InjectionSiteSchema = z.enum(['abdomen', 'thigh', 'upper_arm', 'other', 'not_applicable']);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalGLP1Rating = z.union([z.literal(''), ratingSchema]).optional();
export const glp1MedicationProfileSchema = z.object({
  id: z.union([z.literal(''), z.string().uuid()]).optional(), medication_name: glp1MedicationSchema,
  custom_medication_name: optionalText(100), started_on: z.union([z.literal(''), isoDateSchema]).optional(),
  prescribed_schedule: z.union([z.literal(''), glp1ScheduleSchema]).optional(),
  usual_day_of_week: z.union([z.literal(''), z.coerce.number().int().min(1).max(7)]).optional(),
  usual_time: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.').optional(), notes: optionalText(1000),
}).superRefine((value, context) => {
  if (value.medication_name === 'other' && !value.custom_medication_name) context.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_medication_name'], message: 'Enter the medication name.' });
  if (value.prescribed_schedule !== 'weekly' && value.usual_day_of_week !== '' && value.usual_day_of_week != null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['usual_day_of_week'], message: 'A usual day applies only to a weekly schedule.' });
});
export const glp1DoseLogSchema = z.object({
  id: z.union([z.literal(''), z.string().uuid()]).optional(), medication_profile_id: z.string().uuid(), event_type: glp1DoseEventTypeSchema,
  dose_amount: z.union([z.literal(''), z.coerce.number().positive('Dose must be greater than zero.')]).optional(),
  dose_unit: z.union([z.literal(''), glp1DoseUnitSchema]).optional(), taken_at: z.string().min(1, 'Date and time are required.'),
  injection_site: z.union([z.literal(''), glp1InjectionSiteSchema]).optional(), notes: optionalText(1000),
}).superRefine((value, context) => {
  if (value.event_type === 'taken' && value.dose_amount === '') context.addIssue({ code: z.ZodIssueCode.custom, path: ['dose_amount'], message: 'Dose is required for a Taken entry.' });
  if (value.event_type === 'taken' && !value.dose_unit) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dose_unit'], message: 'Dose unit is required for a Taken entry.' });
});
export const glp1SymptomLogSchema = z.object({
  medication_profile_id: z.union([z.literal(''), z.string().uuid()]).optional(), dose_log_id: z.union([z.literal(''), z.string().uuid()]).optional(),
  logged_at: z.string().min(1, 'Date and time are required.'), appetite: optionalGLP1Rating, hunger: optionalGLP1Rating,
  nausea: optionalGLP1Rating, constipation: optionalGLP1Rating, diarrhea: optionalGLP1Rating, reflux: optionalGLP1Rating,
  fatigue: optionalGLP1Rating, headache: optionalGLP1Rating, abdominal_discomfort: optionalGLP1Rating,
  other_symptoms: optionalText(500), notes: optionalText(1000),
});

export const emailSchema = z.string().email();

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  first_name: z.string().min(1).max(80).optional(),
  last_name: z.string().min(1).max(80).optional(),
  display_name: z.string().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirm_password: z.string().min(1, 'Confirm your new password.'),
}).refine((value) => value.password === value.confirm_password, {
  message: 'Passwords do not match.', path: ['confirm_password'],
});

export const profileSchema = z.object({
  first_name: z.string().max(80).nullable().optional(),
  last_name: z.string().max(80).nullable().optional(),
  display_name: z.string().max(80).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  sex: z.string().max(30).nullable().optional(),
  timezone: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
  unit_system: unitSystemSchema.optional(),
});

export const goalTargetsSchema = z.object({
  goal_type: goalTypeSchema.default('lose_weight'),
  starting_weight: z.coerce.number().positive('Starting weight must be greater than zero.'),
  goal_weight: z.coerce.number().positive('Goal weight must be greater than zero.'),
  height: z.coerce.number().positive('Height must be greater than zero.'),
  activity_level: activityLevelSchema,
  daily_calorie_target: z.coerce.number().int('Calories must be a whole number.').positive('Calorie target must be greater than zero.'),
  daily_protein_target: z.coerce.number().nonnegative('Protein target cannot be negative.'),
  daily_carbs_target: z.coerce.number().nonnegative('Carbohydrate target cannot be negative.'),
  daily_fat_target: z.coerce.number().nonnegative('Fat target cannot be negative.'),
  daily_water_target: z.coerce.number().positive('Water target must be greater than zero.'),
  daily_step_target: z.coerce.number().int('Steps must be a whole number.').nonnegative('Step target cannot be negative.'),
});

export const onboardingSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  display_name: z.string().min(1).max(80),
  date_of_birth: z.string().min(1),
  unit_system: unitSystemSchema,
  timezone: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
}).and(goalTargetsSchema);

export const goalSettingsSchema = goalTargetsSchema.omit({ starting_weight: true, height: true }).extend({
  unit_system: unitSystemSchema,
});

export const onboardingBasicSchema = onboardingSchema;

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingBasicInput = OnboardingInput;
export type GoalTargetsInput = z.infer<typeof goalTargetsSchema>;
export type GoalSettingsInput = z.infer<typeof goalSettingsSchema>;
export type FoodInput = z.infer<typeof foodSchema>;
export type FoodLogInput = z.infer<typeof foodLogSchema>;
export type QuickAddInput = z.infer<typeof quickAddSchema>;
export type SavedMealInput = z.infer<typeof savedMealSchema>;
export type SavedMealDetailsInput = z.infer<typeof savedMealDetailsSchema>;
export type WaterLogInput = z.infer<typeof waterLogSchema>;
export type HabitInput = z.infer<typeof habitSchema>;
export type HabitCompletionInput = z.infer<typeof habitCompletionSchema>;
export type DailyCheckInInput = z.infer<typeof dailyCheckInSchema>;
export type WeeklyCheckInInput = z.infer<typeof weeklyCheckInSchema>;
export type GLP1MedicationProfileInput = z.infer<typeof glp1MedicationProfileSchema>;
export type GLP1DoseLogInput = z.infer<typeof glp1DoseLogSchema>;
export type GLP1SymptomLogInput = z.infer<typeof glp1SymptomLogSchema>;

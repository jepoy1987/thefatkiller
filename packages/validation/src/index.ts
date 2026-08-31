import { z } from 'zod';
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
export const goalTypeSchema = z.enum(['lose_weight', 'maintain_weight', 'gain_weight']);
export const activityLevelSchema = z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']);

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

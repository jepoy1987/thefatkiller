import { z } from 'zod';

export const unitSystemSchema = z.enum(['metric', 'imperial']);
export const roleSchema = z.enum(['user', 'coach', 'admin']);

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

export const onboardingSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  display_name: z.string().min(1).max(80),
  date_of_birth: z.string().min(1),
  unit_system: unitSystemSchema,
  timezone: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
});

export const onboardingBasicSchema = onboardingSchema;

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingBasicInput = OnboardingInput;

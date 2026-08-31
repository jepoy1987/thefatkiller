export const appConfig = {
  appUrl: 'http://localhost:3001',
  websiteUrl: 'https://thefatkiller.com',
  authRedirectPath: '/auth/callback',
  onboardingPath: '/onboarding',
  dashboardPath: '/dashboard',
  defaultLocale: 'en',
  defaultTimezone: 'UTC',
  defaultUnitSystem: 'metric' as const,
};

export const supportedRoles = ['user', 'coach', 'admin'] as const;

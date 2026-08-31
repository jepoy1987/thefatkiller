export const appConfig = {
  appUrl: 'https://app.thefatkiller.com',
  websiteUrl: 'https://thefatkiller.com',
  authRedirectPath: '/auth/callback',
  onboardingPath: '/onboarding',
  dashboardPath: '/dashboard',
  defaultLocale: 'en',
  defaultTimezone: 'UTC',
  defaultUnitSystem: 'metric' as const,
};

export const supportedRoles = ['user', 'coach', 'admin'] as const;

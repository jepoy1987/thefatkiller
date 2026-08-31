export type AuthSessionStatus = 'authenticated' | 'unauthenticated' | 'loading';

export type RedirectDecision = {
  shouldRedirect: boolean;
  target: string;
};

export function getAuthRedirectForState({
  isAuthenticated,
  onboardingCompleted,
}: {
  isAuthenticated: boolean;
  onboardingCompleted: boolean | null;
}): RedirectDecision {
  if (!isAuthenticated) {
    return { shouldRedirect: true, target: '/login' };
  }

  if (!onboardingCompleted) {
    return { shouldRedirect: true, target: '/onboarding' };
  }

  return { shouldRedirect: false, target: '/dashboard' };
}

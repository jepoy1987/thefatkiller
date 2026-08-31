export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

export type ProfileApiState = {
  id: string;
  email: string | null;
  onboarding_completed: boolean;
  unit_system: 'metric' | 'imperial';
};

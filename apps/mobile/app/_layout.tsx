import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../providers/auth';

function Routes() {
  const { session, profile, goal, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const group = segments[0];
    if (!session && group !== '(auth)') router.replace('/login');
    else if (session && (!profile?.onboarding_completed || !goal) && group !== 'onboarding') router.replace('/onboarding');
    else if (session && profile?.onboarding_completed && goal && (group === '(auth)' || group === 'onboarding' || !group)) router.replace('/');
  }, [goal, loading, profile?.onboarding_completed, router, segments, session]);
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return <AuthProvider><Routes /></AuthProvider>;
}

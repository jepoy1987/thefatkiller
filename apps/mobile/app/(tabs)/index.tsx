import { Text, View } from 'react-native';
import { useAuth } from '../../providers/auth';

export default function TodayScreen() {
  const { session, profile } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Today</Text>
      <Text style={{ marginTop: 12 }}>Welcome, {profile?.display_name ?? profile?.first_name ?? 'there'}</Text>
      <Text style={{ marginTop: 8, color: '#475569' }}>{session?.user.email}</Text>
      <Text style={{ marginTop: 8, color: '#475569' }}>Profile ID: {profile?.id}</Text>
      <Text style={{ marginTop: 8, color: '#475569' }}>Unit system: {profile?.unit_system}</Text>
      <Text style={{ marginTop: 24, fontWeight: '700' }}>Today&apos;s Dashboard</Text>
      <Text style={{ marginTop: 8, color: '#475569' }}>Coming in Sprint 2.</Text>
    </View>
  );
}

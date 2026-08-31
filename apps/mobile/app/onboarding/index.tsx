import { useState } from 'react';
import { Text, TextInput, View, Pressable } from 'react-native';
import { onboardingSchema } from '@tfk/validation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth';

export default function OnboardingScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const [unitSystem, setUnitSystem] = useState(profile?.unit_system ?? 'metric');
  const [message, setMessage] = useState('');
  const submit = async () => {
    const parsed = onboardingSchema.safeParse({ first_name: firstName, last_name: lastName, display_name: displayName, date_of_birth: dateOfBirth, unit_system: unitSystem });
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? 'Invalid profile');
    if (!session) return;
    const { error } = await supabase.from('profiles').update({ ...parsed.data, onboarding_completed: true }).eq('id', session.user.id);
    if (error) return setMessage(error.message);
    await refreshProfile();
  };
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', marginBottom: 8 }}>Welcome to TFK</Text>
      <Text style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Complete your foundation profile.</Text>
      <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 }} />
      <TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 }} />
      <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 }} />
      <TextInput value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="Date of birth (YYYY-MM-DD)" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 }} />
      <TextInput value={unitSystem} onChangeText={(text) => setUnitSystem(text === 'imperial' ? 'imperial' : 'metric')} placeholder="Unit system (metric / imperial)" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 20 }} />
      {!!message && <Text style={{ color: '#b91c1c', marginBottom: 12 }}>{message}</Text>}
      <Pressable onPress={submit} style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Finish onboarding</Text>
      </Pressable>
    </View>
  );
}

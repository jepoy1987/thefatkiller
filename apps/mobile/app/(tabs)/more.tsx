import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { profileSchema } from '@tfk/validation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth';

export default function MoreScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [message, setMessage] = useState('');
  const save = async () => {
    const parsed = profileSchema.pick({ display_name: true }).safeParse({ display_name: displayName });
    if (!parsed.success || !session) return setMessage('Enter a valid display name.');
    const { error } = await supabase.from('profiles').update(parsed.data).eq('id', session.user.id);
    if (error) return setMessage(error.message);
    await refreshProfile();
    setMessage('Profile saved.');
  };
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Profile & settings</Text>
      <Text style={{ marginTop: 12, color: '#475569' }}>{session?.user.email}</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginTop: 20 }} />
      {!!message && <Text style={{ marginTop: 12 }}>{message}</Text>}
      <Pressable onPress={save} style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 }}><Text style={{ color: '#fff' }}>Save changes</Text></Pressable>
      <Pressable onPress={() => supabase.auth.signOut()} style={{ padding: 14, alignItems: 'center', marginTop: 12 }}><Text>Log out</Text></Pressable>
    </View>
  );
}

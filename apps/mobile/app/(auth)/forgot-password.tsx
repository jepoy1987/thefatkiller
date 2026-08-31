import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { emailSchema } from '@tfk/validation';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const submit = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setMessage('Enter a valid email address.');
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: 'tfk://auth/callback' });
    setMessage(error?.message ?? 'If the account exists, a reset link has been sent.');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', marginBottom: 8 }}>Reset password</Text>
      <Text style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Enter your email to receive a reset link.</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16 }} />
      {!!message && <Text style={{ marginBottom: 12 }}>{message}</Text>}
      <Pressable onPress={submit} style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Send reset link</Text>
      </Pressable>
      <View style={{ marginTop: 16 }}>
        <Link href="/login" asChild>
          <Pressable>
            <Text>Back to log in</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

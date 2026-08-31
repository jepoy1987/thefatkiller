import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { signupSchema } from '@tfk/validation';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const submit = async () => {
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? 'Invalid signup');
    const { error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password });
    setMessage(error?.message ?? 'Check your email to confirm your account.');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', marginBottom: 8 }}>Create account</Text>
      <Text style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Start your TFK account.</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 }} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16 }} />
      {!!message && <Text style={{ color: message.startsWith('Check') ? '#15803d' : '#b91c1c', marginBottom: 12 }}>{message}</Text>}
      <Pressable onPress={submit} style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Create account</Text>
      </Pressable>
      <View style={{ marginTop: 16 }}>
        <Link href="/login" asChild>
          <Pressable>
            <Text>Already have an account? Log in</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

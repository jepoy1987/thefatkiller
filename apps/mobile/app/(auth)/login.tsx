import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { loginSchema } from '@tfk/validation';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const submit = async () => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? 'Invalid login');
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setMessage(error?.message ?? '');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', marginBottom: 8 }}>Log in</Text>
      <Text style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Welcome back to TFK.</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 }} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16 }} />
      {!!message && <Text style={{ color: '#b91c1c', marginBottom: 12 }}>{message}</Text>}
      <Pressable onPress={submit} style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Continue</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <Link href="/forgot-password" asChild>
          <Pressable>
            <Text>Forgot password?</Text>
          </Pressable>
        </Link>
        <Link href="/signup" asChild>
          <Pressable>
            <Text>Create account</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

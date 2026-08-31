import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  setItem: async (key: string, value: string) => {
    const chunkSize = 1800;
    const oldCount = Number(await SecureStore.getItemAsync(`${key}:count`) ?? 0);
    const chunks = Array.from({ length: Math.ceil(value.length / chunkSize) }, (_, index) => value.slice(index * chunkSize, (index + 1) * chunkSize));
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}:${index}`, chunk)));
    await SecureStore.setItemAsync(`${key}:count`, String(chunks.length));
    await Promise.all(Array.from({ length: Math.max(0, oldCount - chunks.length) }, (_, index) => SecureStore.deleteItemAsync(`${key}:${chunks.length + index}`)));
  },
};

storage.getItem = async (key: string) => {
  const count = Number(await SecureStore.getItemAsync(`${key}:count`) ?? 0);
  if (!count) return null;
  return (await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}:${index}`)))).join('');
};
storage.removeItem = async (key: string) => {
  const count = Number(await SecureStore.getItemAsync(`${key}:count`) ?? 0);
  await Promise.all([SecureStore.deleteItemAsync(`${key}:count`), ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}:${index}`))]);
};

export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { ...(Platform.OS !== 'web' ? { storage } : {}), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh());
}

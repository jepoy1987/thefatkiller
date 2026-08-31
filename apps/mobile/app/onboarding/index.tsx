import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { heightToCentimeters, onboardingSchema, waterToMilliliters, weightToKilograms } from '@tfk/validation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth';

const inputStyle = { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 } as const;
const Field = ({ label, value, onChangeText, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'numeric' }) => <View><Text style={{ marginBottom: 5, color: '#334155' }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={inputStyle} /></View>;

export default function OnboardingScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ first_name: profile?.first_name ?? '', last_name: profile?.last_name ?? '', display_name: profile?.display_name ?? '', date_of_birth: profile?.date_of_birth ?? '', unit_system: profile?.unit_system ?? 'metric', goal_type: 'lose_weight', starting_weight: '', goal_weight: '', height: '', activity_level: 'moderately_active', daily_calorie_target: '1800', daily_protein_target: '140', daily_carbs_target: '180', daily_fat_target: '60', daily_water_target: '2500', daily_step_target: '10000' });
  const [message, setMessage] = useState('');
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    const parsed = onboardingSchema.safeParse(form);
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? 'Invalid setup');
    if (!session) return setMessage('Sign in again to continue.');
    const input = parsed.data;
    const { error } = await supabase.rpc('complete_onboarding', { p_first_name: input.first_name, p_last_name: input.last_name, p_display_name: input.display_name, p_date_of_birth: input.date_of_birth, p_unit_system: input.unit_system, p_goal_type: input.goal_type, p_starting_weight: weightToKilograms(input.starting_weight, input.unit_system), p_goal_weight: weightToKilograms(input.goal_weight, input.unit_system), p_height: heightToCentimeters(input.height, input.unit_system), p_activity_level: input.activity_level, p_daily_calorie_target: input.daily_calorie_target, p_daily_protein_target: input.daily_protein_target, p_daily_carbs_target: input.daily_carbs_target, p_daily_fat_target: input.daily_fat_target, p_daily_water_target: waterToMilliliters(input.daily_water_target, input.unit_system), p_daily_step_target: input.daily_step_target });
    if (error) return setMessage(error.message);
    await refreshProfile();
  };
  return <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}><Text style={{ fontSize: 32, fontWeight: '700' }}>Build your daily plan</Text><Text style={{ color: '#475569', marginVertical: 12 }}>Planning targets only — not medical advice.</Text>
    <Text style={{ fontSize: 20, fontWeight: '700', marginVertical: 12 }}>1 — About You</Text><Field label="First name" value={form.first_name} onChangeText={set('first_name')} /><Field label="Last name" value={form.last_name} onChangeText={set('last_name')} /><Field label="Display name" value={form.display_name} onChangeText={set('display_name')} /><Field label="Date of birth (YYYY-MM-DD)" value={form.date_of_birth} onChangeText={set('date_of_birth')} />
    <Text style={{ marginBottom: 6 }}>Units</Text><View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>{['metric','imperial'].map((unit) => <Pressable key={unit} onPress={() => set('unit_system')(unit)} style={{ padding: 10, borderRadius: 8, backgroundColor: form.unit_system === unit ? '#0f172a' : '#e2e8f0' }}><Text style={{ color: form.unit_system === unit ? '#fff' : '#0f172a' }}>{unit}</Text></Pressable>)}</View>
    <Text style={{ fontSize: 20, fontWeight: '700', marginVertical: 12 }}>2 — Your Goal</Text><Field label="Starting weight" value={form.starting_weight} onChangeText={set('starting_weight')} keyboardType="numeric" /><Field label="Goal weight" value={form.goal_weight} onChangeText={set('goal_weight')} keyboardType="numeric" /><Field label="Height" value={form.height} onChangeText={set('height')} keyboardType="numeric" /><Field label="Activity: sedentary / lightly_active / moderately_active / very_active / extra_active" value={form.activity_level} onChangeText={set('activity_level')} />
    <Text style={{ fontSize: 20, fontWeight: '700', marginVertical: 12 }}>3 — Daily Targets</Text><Field label="Calories" value={form.daily_calorie_target} onChangeText={set('daily_calorie_target')} keyboardType="numeric" /><Field label="Protein (g)" value={form.daily_protein_target} onChangeText={set('daily_protein_target')} keyboardType="numeric" /><Field label="Carbohydrates (g)" value={form.daily_carbs_target} onChangeText={set('daily_carbs_target')} keyboardType="numeric" /><Field label="Fat (g)" value={form.daily_fat_target} onChangeText={set('daily_fat_target')} keyboardType="numeric" /><Field label="Water" value={form.daily_water_target} onChangeText={set('daily_water_target')} keyboardType="numeric" /><Field label="Steps" value={form.daily_step_target} onChangeText={set('daily_step_target')} keyboardType="numeric" />
    <Text style={{ fontSize: 20, fontWeight: '700', marginVertical: 12 }}>4 — Review</Text><Text style={{ color: '#475569' }}>Your profile and active goal will be saved together.</Text>{!!message && <Text style={{ color: '#b91c1c', marginVertical: 12 }}>{message}</Text>}<Pressable onPress={submit} style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 }}><Text style={{ color: '#fff', fontWeight: '600' }}>Complete setup</Text></Pressable>
  </ScrollView>;
}

import { Text, View } from 'react-native';

export default function ProgressScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Progress</Text>
      <Text style={{ marginTop: 12, color: '#475569' }}>Coming soon.</Text>
    </View>
  );
}

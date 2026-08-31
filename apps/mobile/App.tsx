import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

export default function App() {
  return <ExpoRoot context={{} as never} />;
}

registerRootComponent(App);

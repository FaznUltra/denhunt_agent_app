import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Collapses the team/ folder into a single "team" route (hidden from the
// tab bar; reached from the dashboard).
export default function TeamLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    />
  );
}

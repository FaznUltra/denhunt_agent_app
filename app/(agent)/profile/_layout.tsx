import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Collapses the profile/ folder into a single "Profile" tab.
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    />
  );
}

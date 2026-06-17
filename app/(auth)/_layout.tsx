import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Onboarding flow — see PRD Section 3. Headers hidden; each screen renders
// its own header per the design system.
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.white },
      }}
    />
  );
}

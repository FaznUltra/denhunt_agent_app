import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Agent app shell. Minimal for now — the full tab navigator + dashboard
// come next. See PRD Section 1.3 (core loop).
export default function AgentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    />
  );
}

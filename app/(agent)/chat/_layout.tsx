import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Conversations list + chat threads. Hidden from the tab bar (see (agent)/_layout).
export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

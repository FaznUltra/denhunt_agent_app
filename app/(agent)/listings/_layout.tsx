import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Groups listings/index, create, [id]/index, and [id]/edit into one tab.
// gestureEnabled:false on detail/edit stops iOS swipe-back from returning to
// wherever the user came from (dashboard vs. listings) — those screens use an
// explicit router.push('/(agent)/listings') back instead.
export default function ListingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="[id]/edit" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

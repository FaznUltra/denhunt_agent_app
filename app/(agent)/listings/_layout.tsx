import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Groups listings/index, create, and [id] into one "Listings" tab.
export default function ListingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    />
  );
}

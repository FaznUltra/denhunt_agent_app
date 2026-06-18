import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

// Groups enquiries/index and [id] into one "Enquiries" tab.
export default function EnquiriesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    />
  );
}

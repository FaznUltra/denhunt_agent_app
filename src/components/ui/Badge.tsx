import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export type BadgeStatus = 'active' | 'pending' | 'verified' | 'rejected';

export interface BadgeProps {
  status: BadgeStatus;
  label: string;
}

const palette: Record<BadgeStatus, { bg: string; fg: string }> = {
  active: { bg: colors.blue50, fg: colors.blue600 },
  pending: { bg: colors.warningBg, fg: colors.warningText },
  verified: { bg: colors.successBg, fg: colors.successText },
  rejected: { bg: colors.errorBg, fg: colors.errorText },
};

// Badge — status pill. See docs/denhunt-design-system.md.
export function Badge({ status, label }: BadgeProps) {
  const { bg, fg } = palette[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  text: { fontFamily: fonts.medium, fontSize: 12 },
});

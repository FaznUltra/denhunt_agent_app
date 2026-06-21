import { Pressable, Text, View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  // Optional secondary "way out" (e.g. clear a filter).
  secondaryLabel?: string;
  onSecondary?: () => void;
}

// Centred empty state. Always offers a way out via a clearly visible CTA.
// See docs/denhunt-design-system.md (Empty state).
export default function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Feather name={icon} size={48} color={colors.gray400} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {ctaLabel && onCta ? (
        <Pressable accessibilityRole="button" style={styles.cta} onPress={onCta}>
          <Feather name="plus" size={18} color={colors.white} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}

      {secondaryLabel && onSecondary ? (
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={onSecondary}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 24 },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.gray900,
    marginTop: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray500,
    marginTop: 6,
    maxWidth: 260,
    textAlign: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  ctaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  secondary: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.blue600 },
});

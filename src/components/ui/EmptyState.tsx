import { Text, View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

// Centred empty state. See docs/denhunt-design-system.md (Empty state).
export default function EmptyState({ icon, title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Feather name={icon} size={48} color={colors.gray400} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {ctaLabel && onCta && (
        <View style={styles.cta}>
          <Button label={ctaLabel} onPress={onCta} fullWidth={false} />
        </View>
      )}
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
  cta: { marginTop: 20 },
});

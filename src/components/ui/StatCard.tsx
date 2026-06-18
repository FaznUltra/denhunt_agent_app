import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface StatCardProps {
  value: number | string;
  label: string;
  onPress?: () => void;
  accent?: boolean;
}

// Stat card for dashboard grids. White with a border so it reads on the
// gray-50 page (design system uses borders, not shadows).
// See docs/denhunt-design-system.md.
export default function StatCard({ value, label, onPress, accent = false }: StatCardProps) {
  const content = (
    <>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" style={styles.card} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  value: { fontFamily: fonts.bold, fontSize: 22, color: colors.gray900, letterSpacing: -0.3 },
  valueAccent: { color: colors.blue600 },
  label: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray500, marginTop: 2 },
});

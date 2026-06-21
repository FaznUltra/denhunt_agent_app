import { Pressable, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // 'solid' = filled blue when selected; 'soft' = blue-50 tint when selected.
  variant?: 'solid' | 'soft';
  grow?: boolean;
  showCheck?: boolean;
}

// Selectable pill/chip used across the listing form.
export function Pill({ label, selected, onPress, variant = 'solid', grow = false, showCheck = false }: PillProps) {
  const containerStyle = selected
    ? variant === 'solid'
      ? styles.solidSelected
      : styles.softSelected
    : styles.unselected;
  const textStyle = selected
    ? variant === 'solid'
      ? styles.textSolidSelected
      : styles.textSoftSelected
    : styles.textUnselected;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, containerStyle, grow && styles.grow]}>
      {showCheck && selected ? <Feather name="check" size={12} color={colors.blue600} /> : null}
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  grow: { flex: 1 },
  unselected: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200 },
  solidSelected: { backgroundColor: colors.blue600, borderWidth: 1.5, borderColor: colors.blue600 },
  softSelected: { backgroundColor: colors.blue50, borderWidth: 1.5, borderColor: colors.blue600 },
  textUnselected: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray700 },
  textSolidSelected: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  textSoftSelected: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600 },
});

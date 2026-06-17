import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface AvatarProps {
  name: string;
  size?: number;
}

// Derive up to two uppercase initials from a full name.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Avatar — initials circle. See docs/denhunt-design-system.md.
export function Avatar({ name, size = 40 }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.bold, color: colors.blue600 },
});

import { Image, Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface AvatarProps {
  name: string;
  size?: number;
  uri?: string | null;
}

// Derive up to two uppercase initials from a full name.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Avatar — profile photo if provided, else initials circle.
// See docs/denhunt-design-system.md.
export function Avatar({ name, size = 40, uri }: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.circle, dimensions]} />;
  }

  return (
    <View style={[styles.circle, dimensions]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initialsOf(name)}</Text>
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

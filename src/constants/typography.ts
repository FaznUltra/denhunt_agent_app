import { StyleSheet } from 'react-native';
import { colors } from './colors';

// DenHunt type scale — see docs/denhunt-design-system.md.
// Use these styles for all text; never hardcode fontSize/fontFamily elsewhere.
export const type = StyleSheet.create({
  display: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -0.5, lineHeight: 37, color: colors.gray900 },
  heading1: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.3, lineHeight: 29, color: colors.gray900 },
  heading2: { fontFamily: 'Inter_600SemiBold', fontSize: 18, letterSpacing: -0.2, lineHeight: 23, color: colors.gray900 },
  heading3: { fontFamily: 'Inter_600SemiBold', fontSize: 15, letterSpacing: 0, lineHeight: 21, color: colors.gray900 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, letterSpacing: 0, lineHeight: 22, color: colors.gray700 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, letterSpacing: 0, lineHeight: 18, color: colors.gray500 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5, lineHeight: 15, color: colors.gray500, textTransform: 'uppercase' },
  price: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.3, lineHeight: 26, color: colors.gray900 },
  priceSmall: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.2, lineHeight: 22, color: colors.gray900 },
});

// Font family constants for one-off use (e.g. composing custom styles).
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

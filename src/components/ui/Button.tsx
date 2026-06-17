import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  StyleSheet,
} from 'react-native';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'disabled'> {
  variant?: ButtonVariant;
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const containerByVariant = {
  primary: 'primaryContainer',
  secondary: 'secondaryContainer',
  ghost: 'ghostContainer',
} as const;

const labelByVariant = {
  primary: 'primaryLabel',
  secondary: 'secondaryLabel',
  ghost: 'ghostLabel',
} as const;

const spinnerColorByVariant: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.blue600,
  ghost: colors.gray900,
};

// Button — primary / secondary / ghost. See docs/denhunt-design-system.md.
export function Button({
  variant = 'primary',
  label,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[containerByVariant[variant]],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={spinnerColorByVariant[variant]} />
      ) : (
        <Text style={[styles.labelBase, styles[labelByVariant[variant]]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  labelBase: { fontSize: 15, letterSpacing: 0 },

  primaryContainer: {
    backgroundColor: colors.blue600,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryLabel: { fontFamily: fonts.semibold, color: colors.white },

  secondaryContainer: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.blue600,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  secondaryLabel: { fontFamily: fonts.semibold, color: colors.blue600 },

  ghostContainer: {
    backgroundColor: colors.gray50,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  ghostLabel: { fontFamily: fonts.medium, color: colors.gray900 },
});

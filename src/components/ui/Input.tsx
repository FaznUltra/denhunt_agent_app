import { useState } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  StyleSheet,
} from 'react-native';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
}

// Input — labelled text field with focus + error states.
// See docs/denhunt-design-system.md.
export function Input({
  label,
  error,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.field,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
        placeholderTextColor={colors.gray400}
        secureTextEntry={secureTextEntry}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 5,
  },
  field: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  focused: { borderColor: colors.blue600 },
  errored: { borderColor: colors.errorText },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.errorText,
    marginTop: 5,
  },
});

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface InspectionCodeModalProps {
  visible: boolean;
  renterName: string;
  onClose: () => void;
  onConfirm: (code: string) => Promise<boolean>;
}

const CODE_LENGTH = 6;
const BOXES = Array.from({ length: CODE_LENGTH }, (_, i) => i);

export default function InspectionCodeModal({ visible, renterName, onClose, onConfirm }: InspectionCodeModalProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCode('');
      setError(false);
      setSuccess(false);
      scale.setValue(0);
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, scale]);

  async function handleConfirm() {
    if (code.length !== CODE_LENGTH || loading) return;
    setLoading(true);
    setError(false);
    const ok = await onConfirm(code);
    setLoading(false);
    if (ok) {
      setSuccess(true);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      setTimeout(() => onClose(), 1500);
    } else {
      setError(true);
      setCode('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, success && styles.sheetSuccess, { paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.handle} />

          {success ? (
            <View style={styles.successWrap}>
              <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
                <Feather name="check" size={36} color={colors.successText} />
              </Animated.View>
              <Text style={styles.successTitle}>Inspection started!</Text>
              <Text style={styles.successBody}>Payment will be released in 8 hours</Text>
            </View>
          ) : (
            <>
              <View style={styles.iconBlock}>
                <Feather name="key" size={32} color={colors.blue600} />
              </View>
              <Text style={styles.title}>Enter inspection code</Text>
              <Text style={styles.subtitle}>
                Ask {renterName || 'the renter'} for their 6-digit code from the DenHunt app
              </Text>

              <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
                {BOXES.map((i) => {
                  const char = code[i] ?? '';
                  const active = focused && i === code.length;
                  const filled = i < code.length;
                  return (
                    <View key={i} style={[styles.box, (active || filled) && styles.boxActive]}>
                      <Text style={styles.digit}>{char}</Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={inputRef}
                  style={styles.hiddenInput}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH));
                    if (error) setError(false);
                  }}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </Pressable>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={16} color={colors.errorText} />
                  <Text style={styles.errorText}>Incorrect code. Ask the renter to check their app.</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.confirmBtn, (code.length < CODE_LENGTH || loading) && styles.confirmBtnDisabled]}
                disabled={code.length < CODE_LENGTH || loading}
                onPress={handleConfirm}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmText}>Confirm inspection</Text>
                )}
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 8 },
  sheetSuccess: { backgroundColor: colors.successBg },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 8 },
  iconBlock: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray900, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 28 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 48,
    height: 58,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.blue600, backgroundColor: colors.white },
  digit: { fontFamily: fonts.bold, fontSize: 26, color: colors.gray900 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.errorText },
  confirmBtn: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  cancelText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray500 },
  successWrap: { alignItems: 'center', paddingVertical: 24 },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successBg,
    borderWidth: 3,
    borderColor: colors.successText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.successText, marginTop: 16 },
  successBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.successText, opacity: 0.8, marginTop: 6 },
});

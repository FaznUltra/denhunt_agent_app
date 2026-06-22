import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { SectionLabel, Skeleton } from '@/components/ui';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import type { InspectionSession } from '@/types/database';
import type { DisputeInfo, EvidenceItem } from '@/types/chat';

export interface DisputeResponseModalProps {
  visible: boolean;
  onClose: () => void;
  session: InspectionSession | null;
  renterName: string;
  dispute: DisputeInfo | null;
  onAddEvidence: (localUri: string, type: 'photo' | 'video', contentType: string) => Promise<boolean>;
  onSubmit: (statement: string) => Promise<boolean>;
}

function EvidenceThumb({ item }: { item: EvidenceItem }) {
  const signed = useSignedUrl(item.url, 'chat-media');
  if (item.type === 'video') {
    return (
      <View style={[styles.thumb, styles.videoThumb]}>
        <Feather name="play" size={20} color={colors.white} />
      </View>
    );
  }
  if (!signed) return <Skeleton width={100} height={100} borderRadius={12} />;
  return <Image source={{ uri: signed }} style={styles.thumb} resizeMode="cover" />;
}

export default function DisputeResponseModal({
  visible,
  onClose,
  session,
  renterName,
  dispute,
  onAddEvidence,
  onSubmit,
}: DisputeResponseModalProps) {
  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addingEvidence, setAddingEvidence] = useState(false);

  const proximity = session?.gps_proximity_metres ?? null;
  const nearProperty = proximity != null && proximity <= 150;

  async function handlePicked(res: ImagePicker.ImagePickerResult, type: 'photo' | 'video') {
    if (res.canceled || !res.assets[0]) return;
    setAddingEvidence(true);
    const ok = await onAddEvidence(res.assets[0].uri, type, type === 'video' ? 'video/mp4' : 'image/jpeg');
    setAddingEvidence(false);
    if (!ok) Alert.alert('Upload failed', 'Check your connection and try again.');
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    handlePicked(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }), 'photo');
  }
  async function recordVideo() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    handlePicked(await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60 }), 'video');
  }
  async function uploadGallery() {
    handlePicked(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] }), 'photo');
  }

  function openEvidencePicker() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take photo', 'Record video', 'Upload from gallery', 'Cancel'], cancelButtonIndex: 3 },
        (i) => {
          if (i === 0) takePhoto();
          else if (i === 1) recordVideo();
          else if (i === 2) uploadGallery();
        },
      );
    } else {
      Alert.alert('Add evidence', undefined, [
        { text: 'Take photo', onPress: takePhoto },
        { text: 'Record video', onPress: recordVideo },
        { text: 'Upload from gallery', onPress: uploadGallery },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const ok = await onSubmit(statement);
    setSubmitting(false);
    if (ok) {
      Alert.alert(
        'Response submitted',
        'DenHunt admin will review all evidence within 24–48 hours and notify both parties of the verdict.',
      );
      setStatement('');
      onClose();
    } else {
      Alert.alert('Could not submit', 'Please try again.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dispute response</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={colors.gray500} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.alertBanner}>
            <Feather name="alert-circle" size={20} color={colors.errorText} />
            <View style={styles.flex}>
              <Text style={styles.alertTitle}>Dispute raised by {renterName}</Text>
              {dispute?.reason ? <Text style={styles.alertReason}>{dispute.reason}</Text> : null}
            </View>
          </View>

          {dispute?.description ? (
            <View style={styles.block}>
              <SectionLabel text="Renter's claim" />
              <View style={styles.claimBox}>
                <Text style={styles.claimText}>{dispute.description}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.block}>
            <SectionLabel text="Renter's evidence" />
            {dispute && dispute.renter_evidence.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                {dispute.renter_evidence.map((e) => (
                  <EvidenceThumb key={e.id} item={e} />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No photos or videos submitted</Text>
              </View>
            )}
          </View>

          <View style={styles.block}>
            <SectionLabel text="Location check" />
            <View style={styles.gpsBox}>
              <Feather name="map-pin" size={18} color={nearProperty ? colors.successText : colors.errorText} />
              <View style={styles.flex}>
                {proximity == null ? (
                  <Text style={styles.gpsTitleMuted}>No location data captured</Text>
                ) : nearProperty ? (
                  <>
                    <Text style={[styles.gpsTitle, { color: colors.successText }]}>Both parties near the property</Text>
                    <Text style={styles.gpsSub}>{proximity.toFixed(0)}m from listing (within 150m threshold)</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.gpsTitle, { color: colors.errorText }]}>Location mismatch detected</Text>
                    <Text style={styles.gpsSub}>{proximity.toFixed(0)}m from listing location</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.block}>
            <SectionLabel text="Your evidence" />
            {dispute && dispute.agent_evidence.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                {dispute.agent_evidence.map((e) => (
                  <EvidenceThumb key={e.id} item={e} />
                ))}
              </ScrollView>
            ) : null}
            <Pressable style={styles.addEvidence} onPress={openEvidencePicker} disabled={addingEvidence}>
              {addingEvidence ? (
                <ActivityIndicator color={colors.blue600} />
              ) : (
                <>
                  <Feather name="plus" size={18} color={colors.blue600} />
                  <Text style={styles.addEvidenceText}>Add photo or video evidence</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.block}>
            <SectionLabel text="Your statement (optional)" />
            <TextInput
              style={styles.statement}
              value={statement}
              onChangeText={setStatement}
              placeholder="Explain what happened during the inspection..."
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{statement.length}/500</Text>
          </View>

          <Pressable style={[styles.submitBtn, submitting && styles.submitDisabled]} disabled={submitting} onPress={handleSubmit}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Submit response to DenHunt</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.gray900 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  alertBanner: { flexDirection: 'row', gap: 10, backgroundColor: colors.errorBg, borderRadius: 12, padding: 14, marginTop: 20 },
  alertTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.errorText },
  alertReason: { fontFamily: fonts.regular, fontSize: 13, color: colors.errorText, opacity: 0.8, marginTop: 3 },
  block: { marginTop: 16 },
  claimBox: { backgroundColor: colors.gray50, borderRadius: 12, padding: 14, marginTop: 8 },
  claimText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray700, lineHeight: 20 },
  thumbRow: { gap: 8, marginTop: 8 },
  thumb: { width: 100, height: 100, borderRadius: 12, backgroundColor: colors.gray200 },
  videoThumb: { backgroundColor: colors.blue900, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { backgroundColor: colors.gray50, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  emptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400 },
  gpsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.gray50, borderRadius: 12, padding: 14, marginTop: 8 },
  gpsTitle: { fontFamily: fonts.semibold, fontSize: 13 },
  gpsTitleMuted: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gray500 },
  gpsSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
  addEvidence: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.blue50,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  addEvidenceText: { fontFamily: fonts.medium, fontSize: 14, color: colors.blue600 },
  statement: {
    height: 100,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray700,
  },
  counter: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 4, textAlign: 'right' },
  submitBtn: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});

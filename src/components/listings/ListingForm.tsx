import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ProgressBar from '@/components/ui/ProgressBar';
import { SectionLabel, Skeleton } from '@/components/ui';
import { Pill } from '@/components/listings/Pill';
import { PickerModal } from '@/components/listings/PickerModal';
import {
  useListingFormStore,
  type ListingFormState,
  type LocalPhoto,
  type LocalVideo,
} from '@/stores/listingFormStore';
import { useListingDetail } from '@/hooks/useListingDetail';
import { supabase } from '@/lib/supabase';
import { formatDate, formatPrice } from '@/utils/format';
import {
  AMENITY_GROUPS,
  BEDROOM_OPTIONS,
  CATEGORIES,
  COUNT_OPTIONS,
  FLOORS,
  FURNISHING,
  NIGERIAN_STATES,
  OCCUPANCY,
  PARKING,
  PURPOSES,
  lgasForState,
} from '@/constants/listingOptions';
import type { Database } from '@/types/database';

type ListingInsert = Database['public']['Tables']['listings']['Insert'];
type ListingUpdate = Database['public']['Tables']['listings']['Update'];

const STEP_TITLES = [
  'Property type',
  'Add photos & video',
  'Property details',
  'Amenities',
  'Location',
  'Pricing',
  'Availability',
  'Review & submit',
];

export interface ListingFormProps {
  listingId?: string;
  onComplete: () => void;
}

// Build the listings column payload from the form store (shared by insert + update).
function buildPayload(s: ListingFormState): Record<string, unknown> {
  return {
    category: s.category ?? '',
    purpose: s.purpose ?? '',
    title: s.title || 'Untitled listing',
    description: s.description || null,
    bedrooms: s.bedrooms ?? 0,
    bathrooms: s.bathrooms ?? 0,
    toilets: s.toilets ?? 0,
    furnishing: s.furnishing,
    floor: s.floor,
    size_sqm: s.size_sqm ? parseFloat(s.size_sqm) : null,
    year_built: s.year_built ? parseInt(s.year_built, 10) : null,
    parking: s.parking,
    land_size: s.land_size || null,
    amenities: s.amenities,
    state: s.state_ ?? null,
    lga: s.lga,
    area: s.area || null,
    street_address: s.street_address || null,
    show_exact_address: s.show_exact_address,
    latitude: s.latitude,
    longitude: s.longitude,
    price: s.price ? parseFloat(s.price) : 0,
    payment_frequency: s.payment_frequency,
    caution_fee: s.caution_fee || null,
    agency_fee: s.agency_fee || null,
    service_charge: s.service_charge ? parseFloat(s.service_charge) : null,
    price_negotiable: s.price_negotiable,
    inspection_fee: s.inspection_fee ? parseFloat(s.inspection_fee) : null,
    available_from: s.available_from,
    available_until: s.available_until,
    occupancy_status: s.occupancy_status,
  };
}

// Compress + upload a local photo, return its public URL.
async function uploadPhotoFile(localUri: string, userId: string, listingId: string, index: number) {
  const compressed = await manipulateAsync(localUri, [{ resize: { width: 1200 } }], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  const base64 = await new File(compressed.uri).base64();
  const bytes = decodeBase64(base64);
  const path = `${userId}/${listingId}/photos/${Date.now()}_${index}.jpg`;
  const { error } = await supabase.storage
    .from('listing-media')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}

// Upload a video by streaming the file directly to Supabase Storage (binary
// upload), so large videos never get loaded into JS memory.
async function uploadVideoFile(localUri: string, userId: string, listingId: string) {
  const path = `${userId}/${listingId}/video/${Date.now()}.mp4`;
  const endpoint = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/listing-media/${path}`;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const result = await LegacyFS.uploadAsync(endpoint, localUri, {
    httpMethod: 'POST',
    uploadType: LegacyFS.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'content-type': 'video/mp4',
      'x-upsert': 'true',
    },
  });
  if (result.status !== 200) throw new Error(`Video upload failed (${result.status})`);
  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}

export function ListingForm({ listingId: editId, onComplete }: ListingFormProps) {
  const insets = useSafeAreaInsets();
  const isEdit = !!editId;
  const s = useListingFormStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [lgaPickerOpen, setLgaPickerOpen] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<'from' | 'until' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const successScale = useRef(new Animated.Value(0)).current;
  const loadedRef = useRef(false);
  const recoveryChecked = useRef(false);

  // Edit mode: load existing listing once.
  const detail = useListingDetail(isEdit ? (editId as string) : '');

  // Resolve auth user + agency scope.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role === 'agency_agent') {
        const { data: member } = await supabase
          .from('agency_members')
          .select('agency_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (mounted && member?.agency_id) setAgencyId(member.agency_id);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Edit mode: hydrate the store from the fetched listing.
  useEffect(() => {
    if (isEdit && !loadedRef.current && detail.listing) {
      loadedRef.current = true;
      s.loadFromListing(detail.listing, detail.media);
      s.setStep(1);
    }
  }, [isEdit, detail.listing, detail.media, s]);

  // Create mode: offer draft recovery if a persisted draft exists.
  useEffect(() => {
    if (isEdit || recoveryChecked.current) return;
    recoveryChecked.current = true;
    if (s.listingId) {
      Alert.alert('Resume your listing?', 'You have an unfinished listing. Continue where you left off?', [
        { text: 'Start fresh', onPress: () => s.reset() },
        { text: 'Resume' },
      ]);
    }
  }, [isEdit, s]);

  const step = s.currentStep;

  function showError(message: string) {
    Alert.alert('Something went wrong', message);
  }

  // ---- Persistence ----
  async function uploadOnePhoto(listingId: string, photo: LocalPhoto) {
    if (!userId) return;
    s.updatePhoto(photo.localUri, { uploading: true, uploadError: false });
    try {
      const url = await uploadPhotoFile(photo.localUri, userId, listingId, photo.orderIndex);
      let mediaId = photo.mediaId;
      if (mediaId) {
        await supabase.from('listing_media').update({ url, order_index: photo.orderIndex }).eq('id', mediaId);
      } else {
        const { data } = await supabase
          .from('listing_media')
          .insert({ listing_id: listingId, type: 'photo', url, order_index: photo.orderIndex })
          .select('id')
          .single();
        mediaId = data?.id ?? null;
      }
      s.updatePhoto(photo.localUri, { remoteUrl: url, mediaId, uploading: false });
    } catch {
      s.updatePhoto(photo.localUri, { uploading: false, uploadError: true });
    }
  }

  async function uploadOneVideo(listingId: string, video: LocalVideo) {
    if (!userId) return;
    s.setVideo({ ...video, uploading: true, uploadError: false });
    try {
      const url = await uploadVideoFile(video.localUri, userId, listingId);
      const orderIndex = useListingFormStore.getState().photos.length;
      let mediaId = video.mediaId;
      if (mediaId) {
        await supabase.from('listing_media').update({ url, order_index: orderIndex }).eq('id', mediaId);
      } else {
        const { data } = await supabase
          .from('listing_media')
          .insert({ listing_id: listingId, type: 'video', url, order_index: orderIndex })
          .select('id')
          .single();
        mediaId = data?.id ?? null;
      }
      s.setVideo({ ...video, remoteUrl: url, mediaId, uploading: false });
    } catch {
      s.setVideo({ ...video, uploading: false, uploadError: true });
    }
  }

  async function uploadPendingMedia(listingId: string) {
    if (!userId) return;
    for (const photo of useListingFormStore.getState().photos) {
      if (photo.remoteUrl) continue;
      await uploadOnePhoto(listingId, photo);
    }
    const video = useListingFormStore.getState().video;
    if (video && !video.remoteUrl) await uploadOneVideo(listingId, video);
  }

  // Refresh the session if it expired; returns false if re-auth is required.
  async function ensureSession(): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        Alert.alert('Session expired', 'Please sign in again to continue.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/phone' as Href) },
        ]);
        return false;
      }
    }
    return true;
  }

  async function retryVideoUpload() {
    if (!s.listingId || !(await ensureSession())) return;
    const video = useListingFormStore.getState().video;
    if (!video) return;
    await uploadOneVideo(s.listingId, video);
    if (useListingFormStore.getState().video?.uploadError) {
      Alert.alert(
        'Upload failed',
        "Your video couldn't be uploaded. This can happen with large files or slow connections. Try again or remove the video and re-add it.",
        [
          { text: 'Try again', onPress: () => retryVideoUpload() },
          { text: 'Remove video', style: 'destructive', onPress: () => s.setVideo(null) },
        ],
      );
    }
  }

  async function retryPhotoUpload(localUri: string) {
    if (!s.listingId || !(await ensureSession())) return;
    const photo = useListingFormStore.getState().photos.find((p) => p.localUri === localUri);
    if (photo) await uploadOnePhoto(s.listingId, photo);
  }

  async function saveDraft(): Promise<string | null> {
    if (s.isSaving) return s.listingId; // single-flight guard
    if (!userId) return null;
    s.setSaving(true);
    try {
      let listingId = s.listingId;
      const payload = buildPayload(useListingFormStore.getState());
      if (!listingId) {
        const { data, error } = await supabase
          .from('listings')
          .insert({ ...payload, posted_by: userId, agency_id: agencyId, status: 'draft' } as ListingInsert)
          .select('id')
          .single();
        if (error || !data) throw new Error(error?.message ?? 'Could not save draft');
        listingId = data.id;
        s.setListingId(listingId);
      } else {
        const { error } = await supabase
          .from('listings')
          .update({ ...payload, updated_at: new Date().toISOString() } as ListingUpdate)
          .eq('id', listingId);
        if (error) throw new Error(error.message);
      }
      await uploadPendingMedia(listingId);
      s.setDirty(false);
      return listingId;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save draft');
      return null;
    } finally {
      s.setSaving(false);
    }
  }

  async function submitListing() {
    const listingId = await saveDraft();
    if (!listingId) return;
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'pending_review' })
        .eq('id', listingId);
      if (error) throw new Error(error.message);
      setSubmitted(true);
      Animated.spring(successScale, { toValue: 1, delay: 100, useNativeDriver: true }).start();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not submit listing');
    }
  }

  // ---- Media picking ----
  async function addPickedAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const base = useListingFormStore.getState().photos.length;
    assets.forEach((asset, i) => {
      s.addPhoto({
        localUri: asset.uri,
        remoteUrl: null,
        mediaId: null,
        orderIndex: base + i,
        uploading: false,
        uploadError: false,
      });
    });
    await saveDraft();
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!res.canceled) await addPickedAssets(res.assets);
  }

  async function pickFromGallery() {
    const remaining = Math.max(1, 20 - useListingFormStore.getState().photos.length);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (!res.canceled) await addPickedAssets(res.assets);
  }

  function openImagePicker() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take photo', 'Choose from gallery', 'Cancel'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) pickFromCamera();
          else if (i === 1) pickFromGallery();
        },
      );
    } else {
      setAndroidPickerOpen(true);
    }
  }

  async function pickVideo() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!res.canceled && res.assets[0]) {
      s.setVideo({
        localUri: res.assets[0].uri,
        remoteUrl: null,
        mediaId: null,
        uploading: false,
        uploadError: false,
      });
      await saveDraft(); // uploads the video immediately
    }
  }

  // ---- Navigation ----
  function handleBack() {
    if (step > 1) {
      s.setStep(step - 1);
      return;
    }
    Alert.alert('Discard listing?', 'Your progress will be lost. Are you sure?', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          if (s.listingId && !isEdit) {
            await supabase.from('listing_media').delete().eq('listing_id', s.listingId);
            await supabase.from('listings').delete().eq('id', s.listingId);
          }
          s.reset();
          onComplete();
        },
      },
    ]);
  }

  async function handleContinue() {
    if (!isStepValid()) return;
    await saveDraft();
    s.setStep(step + 1);
  }

  function isStepValid(): boolean {
    switch (step) {
      case 1:
        return !!s.category && !!s.purpose;
      case 2:
        return (
          s.photos.length >= 3 &&
          s.photos.every((p) => !p.uploading && !p.uploadError) &&
          !s.video?.uploading
        );
      case 3:
        return s.title.trim().length >= 3;
      case 4:
        return true;
      case 5:
        return !!s.state_ && !!s.lga && s.area.trim().length > 0;
      case 6:
        return (
          parseFloat(s.price) > 0 && !!s.payment_frequency && parseFloat(s.inspection_fee) > 0
        );
      case 7:
        return !!s.available_from && !!s.occupancy_status;
      default:
        return true;
    }
  }

  function continueLabel(): string {
    if (s.isSaving) return 'Saving…';
    if (step === 2) {
      if (s.photos.some((p) => p.uploading) || s.video?.uploading) return 'Uploading... please wait';
      if (s.photos.some((p) => p.uploadError)) return 'Fix upload errors to continue';
      if (s.photos.length < 3) return `Add ${3 - s.photos.length} more photo(s)`;
    }
    return 'Continue';
  }

  // Open the picker seeded with the current value (or today).
  function openDatePicker(which: 'from' | 'until') {
    const existing =
      which === 'from' && s.available_from
        ? new Date(s.available_from)
        : which === 'until' && s.available_until
          ? new Date(s.available_until)
          : new Date();
    setTempDate(existing);
    setDatePickerFor(which);
  }

  function commitDate(which: 'from' | 'until', date: Date) {
    if (which === 'from') s.setField('available_from', date.toISOString());
    else s.setField('available_until', date.toISOString());
  }

  // iOS: confirm the drawer selection.
  function confirmDate() {
    if (datePickerFor) commitDate(datePickerFor, tempDate);
    setDatePickerFor(null);
  }

  // Android: native dialog commits immediately on "set".
  function onAndroidDateChange(event: DateTimePickerEvent, date?: Date) {
    const which = datePickerFor;
    setDatePickerFor(null);
    if (event.type === 'set' && date && which) commitDate(which, date);
  }

  const dateMin =
    datePickerFor === 'until' && s.available_from ? new Date(s.available_from) : new Date();

  // ---- Loading / success ----
  if (isEdit && detail.loading && !loadedRef.current) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Skeleton width="100%" height={3} borderRadius={0} />
        <View style={styles.loadingBody}>
          <Skeleton width="60%" height={22} />
          <Skeleton width="100%" height={120} borderRadius={12} />
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.successWrap}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Feather name="check" size={36} color={colors.successText} />
          </Animated.View>
          <Text style={styles.successTitle}>{isEdit ? 'Listing updated!' : 'Listing submitted!'}</Text>
          <Text style={styles.successBody}>
            {isEdit
              ? 'Your listing has been resubmitted for review. We’ll notify you when it goes live.'
              : 'We’ll review your listing within 24 hours and notify you when it goes live.'}
          </Text>
          <Pressable
            style={[styles.primaryButton, styles.successButton]}
            onPress={() => {
              s.reset();
              onComplete();
            }}>
            <Text style={styles.primaryButtonText}>{isEdit ? 'View listing' : 'View my listings'}</Text>
          </Pressable>
          {!isEdit ? (
            <Pressable
              style={[styles.ghostButton, styles.successButton]}
              onPress={() => {
                s.reset();
                setSubmitted(false);
              }}>
              <Text style={styles.ghostButtonText}>Post another listing</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step > 1 ? 'Back' : 'Close'}
          style={styles.headerButton}
          onPress={handleBack}>
          <Feather name={step > 1 ? 'arrow-left' : 'x'} size={20} color={colors.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>{STEP_TITLES[step - 1]}</Text>
        {step < 8 ? (
          <Pressable accessibilityRole="button" onPress={saveDraft} disabled={s.isSaving}>
            {s.isSaving ? (
              <ActivityIndicator size="small" color={colors.blue600} />
            ) : (
              <Text style={styles.saveDraft}>Save draft</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ProgressBar currentStep={step} totalSteps={8} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.stepContent}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {step === 1 ? <Step1 /> : null}
          {step === 2 ? (
            <Step2
              onAddPhoto={openImagePicker}
              onAddVideo={pickVideo}
              onRetryPhoto={retryPhotoUpload}
              onRetryVideo={retryVideoUpload}
            />
          ) : null}
          {step === 3 ? <Step3 /> : null}
          {step === 4 ? <Step4 /> : null}
          {step === 5 ? (
            <Step5
              onOpenState={() => setStatePickerOpen(true)}
              onOpenLga={() => setLgaPickerOpen(true)}
            />
          ) : null}
          {step === 6 ? <Step6 /> : null}
          {step === 7 ? <Step7 onPickDate={openDatePicker} /> : null}
          {step === 8 ? <Step8 /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step < 8 ? (
          <Pressable
            style={[styles.primaryButton, (!isStepValid() || s.isSaving) && styles.disabled]}
            disabled={!isStepValid() || s.isSaving}
            onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>{continueLabel()}</Text>
          </Pressable>
        ) : (
          <View style={styles.bottomRow}>
            <Pressable
              style={[styles.secondaryButton, styles.flex]}
              onPress={async () => {
                await saveDraft();
                onComplete();
              }}>
              <Text style={styles.secondaryButtonText}>Save as draft</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.flex, s.isSaving && styles.disabled]}
              disabled={s.isSaving}
              onPress={submitListing}>
              {s.isSaving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Submit listing</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Pickers */}
      <PickerModal
        visible={statePickerOpen}
        title="Select state"
        options={NIGERIAN_STATES}
        selected={s.state_}
        onSelect={(v) => {
          s.setField('state_', v);
          s.setField('lga', null);
        }}
        onClose={() => setStatePickerOpen(false)}
      />
      <PickerModal
        visible={lgaPickerOpen}
        title="Select LGA"
        options={lgasForState(s.state_)}
        selected={s.lga}
        onSelect={(v) => s.setField('lga', v)}
        onClose={() => setLgaPickerOpen(false)}
      />

      {/* Date picker — iOS shows an inline calendar in a bottom drawer; Android
          uses the native dialog. */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={datePickerFor !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setDatePickerFor(null)}>
          <Pressable style={styles.dateBackdrop} onPress={() => setDatePickerFor(null)}>
            <Pressable style={[styles.dateSheet, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.dateHandle} />
              <Text style={styles.dateTitle}>
                {datePickerFor === 'until' ? 'Available until' : 'Available from'}
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                minimumDate={dateMin}
                onChange={(_, d) => {
                  if (d) setTempDate(d);
                }}
                style={styles.iosPicker}
                accentColor={colors.blue600}
                themeVariant="light"
                textColor={colors.gray900}
              />
              <Pressable style={styles.dateDone} onPress={confirmDate}>
                <Text style={styles.dateDoneText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : datePickerFor ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={dateMin}
          onChange={onAndroidDateChange}
        />
      ) : null}

      {/* Android image source sheet */}
      <Modal
        visible={androidPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAndroidPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setAndroidPickerOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setAndroidPickerOpen(false);
                pickFromCamera();
              }}>
              <Feather name="camera" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Take photo</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setAndroidPickerOpen(false);
                pickFromGallery();
              }}>
              <Feather name="image" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Choose from gallery</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================================================
// Steps
// ===========================================================================

function Step1() {
  const { category, purpose, setField } = useListingFormStore();
  return (
    <>
      <Text style={styles.headline}>What are you listing?</Text>
      <Text style={styles.subtext}>Select a type and what you&apos;re listing it for.</Text>

      <SectionLabel text="Property type" />
      <View style={styles.catGrid}>
        {CATEGORIES.map((c) => {
          const selected = category === c.value;
          return (
            <Pressable
              key={c.value}
              style={[styles.catCard, selected && styles.catCardSelected]}
              onPress={() => setField('category', c.value)}>
              <Feather name={c.icon} size={22} color={selected ? colors.blue600 : colors.gray400} />
              <Text style={[styles.catLabel, selected && styles.catLabelSelected]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.gapTop24}>
        <SectionLabel text="Listing purpose" />
        <View style={styles.pillRow}>
          {PURPOSES.map((p) => (
            <Pill
              key={p.value}
              label={p.label}
              selected={purpose === p.value}
              grow
              onPress={() => setField('purpose', p.value)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

function Step2({
  onAddPhoto,
  onAddVideo,
  onRetryPhoto,
  onRetryVideo,
}: {
  onAddPhoto: () => void;
  onAddVideo: () => void;
  onRetryPhoto: (localUri: string) => void;
  onRetryVideo: () => void;
}) {
  const { photos, video, removePhoto, setVideo } = useListingFormStore();
  const countMsg =
    photos.length === 0
      ? { text: 'Add at least 3 photos to continue', color: colors.errorText }
      : photos.length < 3
        ? { text: `${3 - photos.length} more photo(s) needed`, color: colors.warningText }
        : { text: `${photos.length}/20 photos`, color: colors.successText };

  return (
    <>
      <Text style={styles.headline}>Add photos &amp; video</Text>
      <Text style={styles.subtext}>Minimum 3 photos required. First photo is the cover.</Text>

      <SectionLabel text="Photos (min 3, max 20)" />
      <View style={styles.photoGrid}>
        {photos.map((photo, i) => (
          <View key={photo.localUri} style={styles.photoCell}>
            <Image source={{ uri: photo.localUri }} style={styles.photoImage} resizeMode="cover" />
            {photo.uploading ? (
              <View style={styles.photoOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
            {photo.uploadError ? (
              <View style={[styles.photoOverlay, styles.photoErrorOverlay]}>
                <Feather name="alert-circle" size={20} color={colors.white} />
              </View>
            ) : null}
            <Pressable style={styles.photoDelete} onPress={() => removePhoto(photo.localUri)}>
              <Feather name="x" size={12} color={colors.white} />
            </Pressable>
            <View style={styles.photoOrder}>
              <Text style={styles.photoOrderText}>{i + 1}</Text>
            </View>
            {i === 0 ? (
              <View style={styles.photoCover}>
                <Text style={styles.photoCoverText}>Cover</Text>
              </View>
            ) : null}
          </View>
        ))}
        {photos.length < 20 ? (
          <Pressable style={styles.addPhoto} onPress={onAddPhoto}>
            <Feather name="plus" size={28} color={colors.gray400} />
            <Text style={styles.addPhotoText}>Add photo</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.countMsg, { color: countMsg.color }]}>{countMsg.text}</Text>
      {/* TODO: drag-to-reorder is Phase 2 */}
      <Text style={styles.reorderNote}>Hold and drag to reorder photos (coming soon)</Text>

      <View style={styles.gapTop24}>
        <SectionLabel text="Video walk-through (optional)" />
        <Text style={styles.videoHint}>Max 60 seconds · Max 100MB</Text>
        {video ? (
          <View style={styles.videoAdded}>
            <Feather name="play-circle" size={28} color={colors.white} />
            <Text style={styles.videoAddedText}>
              {video.uploading ? 'Uploading…' : video.uploadError ? 'Upload failed' : 'Video added'}
            </Text>
            {video.uploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Pressable onPress={() => setVideo(null)}>
                <Feather name="trash-2" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable style={styles.addVideo} onPress={onAddVideo}>
            <Feather name="video" size={22} color={colors.gray400} />
            <Text style={styles.addVideoText}>Add video</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
  counter,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
  maxLength?: number;
  counter?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {counter && maxLength ? (
        <Text style={styles.counter}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

function Step3() {
  const s = useListingFormStore();
  const showRooms = s.category !== 'land' && s.category !== 'commercial';
  const showBaths = s.category !== 'land';
  return (
    <>
      <Text style={styles.headline}>Property details</Text>

      <LabeledInput
        label="Listing title"
        value={s.title}
        onChangeText={(t) => s.setField('title', t)}
        placeholder="e.g. 3-bedroom flat, Lekki Phase 1"
        maxLength={80}
        counter
      />
      <LabeledInput
        label="Description"
        value={s.description}
        onChangeText={(t) => s.setField('description', t)}
        placeholder="Describe the property — what makes it stand out?"
        multiline
        maxLength={1000}
        counter
      />

      {showRooms ? (
        <View style={styles.gapTop20}>
          <SectionLabel text="Bedrooms" />
          <View style={styles.pillWrap}>
            {BEDROOM_OPTIONS.map((b) => (
              <Pill key={b.value} label={b.label} selected={s.bedrooms === b.value} onPress={() => s.setField('bedrooms', b.value)} />
            ))}
          </View>
        </View>
      ) : null}
      {showBaths ? (
        <>
          <View style={styles.gapTop20}>
            <SectionLabel text="Bathrooms" />
            <View style={styles.pillWrap}>
              {COUNT_OPTIONS.map((c) => (
                <Pill key={c.value} label={c.label} selected={s.bathrooms === c.value} onPress={() => s.setField('bathrooms', c.value)} />
              ))}
            </View>
          </View>
          <View style={styles.gapTop20}>
            <SectionLabel text="Toilets" />
            <View style={styles.pillWrap}>
              {COUNT_OPTIONS.map((c) => (
                <Pill key={c.value} label={c.label} selected={s.toilets === c.value} onPress={() => s.setField('toilets', c.value)} />
              ))}
            </View>
          </View>
        </>
      ) : null}

      <View style={styles.gapTop20}>
        <SectionLabel text="Furnishing" />
        <View style={styles.pillRow}>
          {FURNISHING.map((f) => (
            <Pill key={f.value} label={f.label} selected={s.furnishing === f.value} grow onPress={() => s.setField('furnishing', f.value)} />
          ))}
        </View>
      </View>

      <View style={styles.gapTop20}>
        <SectionLabel text="Floor" />
        <View style={styles.pillWrap}>
          {FLOORS.map((f) => (
            <Pill key={f.value} label={f.label} selected={s.floor === f.value} onPress={() => s.setField('floor', f.value)} />
          ))}
        </View>
      </View>

      <LabeledInput label="Size (sqm) — optional" value={s.size_sqm} onChangeText={(t) => s.setField('size_sqm', t)} placeholder="e.g. 120" keyboardType="numeric" />
      <LabeledInput label="Year built — optional" value={s.year_built} onChangeText={(t) => s.setField('year_built', t)} placeholder="e.g. 2019" keyboardType="numeric" maxLength={4} />

      <View style={styles.gapTop20}>
        <SectionLabel text="Parking" />
        <View style={styles.pillWrap}>
          {PARKING.map((p) => (
            <Pill key={p.value} label={p.label} selected={s.parking === p.value} onPress={() => s.setField('parking', p.value)} />
          ))}
        </View>
      </View>

      {s.category === 'land' ? (
        <LabeledInput label="Land size" value={s.land_size} onChangeText={(t) => s.setField('land_size', t)} placeholder="e.g. 600 sqm, 1 plot, 2 acres" />
      ) : null}
    </>
  );
}

function Step4() {
  const { amenities, toggleAmenity } = useListingFormStore();
  return (
    <>
      <Text style={styles.headline}>Amenities</Text>
      <Text style={styles.subtext}>Select all that apply.</Text>

      {AMENITY_GROUPS.map((group) => (
        <View key={group.label} style={styles.gapTop20}>
          <SectionLabel text={group.label} />
          <View style={styles.pillWrap}>
            {group.items.map((item) => (
              <Pill
                key={item.value}
                label={item.label}
                selected={amenities.includes(item.value)}
                variant="soft"
                showCheck
                onPress={() => toggleAmenity(item.value)}
              />
            ))}
          </View>
        </View>
      ))}

      {amenities.length > 0 ? (
        <Text style={styles.amenityCount}>{amenities.length} amenities selected</Text>
      ) : null}
    </>
  );
}

function Step5({ onOpenState, onOpenLga }: { onOpenState: () => void; onOpenLga: () => void }) {
  const s = useListingFormStore();
  return (
    <>
      <Text style={styles.headline}>Where is it located?</Text>

      <View style={styles.field}>
        <Text style={styles.inputLabel}>State</Text>
        <Pressable style={styles.selectField} onPress={onOpenState}>
          <Text style={s.state_ ? styles.selectValue : styles.selectPlaceholder}>{s.state_ ?? 'Select state'}</Text>
          <Feather name="chevron-down" size={16} color={colors.gray400} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.inputLabel}>LGA</Text>
        <Pressable
          style={[styles.selectField, !s.state_ && styles.disabled]}
          disabled={!s.state_}
          onPress={onOpenLga}>
          <Text style={s.lga ? styles.selectValue : styles.selectPlaceholder}>{s.lga ?? 'Select LGA'}</Text>
          <Feather name="chevron-down" size={16} color={colors.gray400} />
        </Pressable>
      </View>

      <LabeledInput label="Area / neighbourhood" value={s.area} onChangeText={(t) => s.setField('area', t)} placeholder="e.g. Lekki Phase 1, Ikeja GRA, Wuse 2" />
      <LabeledInput label="Street address (optional)" value={s.street_address} onChangeText={(t) => s.setField('street_address', t)} placeholder="Leave blank to show area only" />

      <View style={styles.toggleRow}>
        <View style={styles.flexShrink}>
          <Text style={styles.toggleTitle}>Show exact address on listing</Text>
          <Text style={styles.toggleSub}>Renters will see full address publicly</Text>
          {!s.show_exact_address ? <Text style={styles.toggleHint}>Only area shown until enquiry</Text> : null}
        </View>
        <Switch
          value={s.show_exact_address}
          onValueChange={(v) => s.setField('show_exact_address', v)}
          trackColor={{ false: colors.gray200, true: colors.blue600 }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.gapTop20}>
        <SectionLabel text="Pin location on map (optional)" />
        {s.latitude != null && s.longitude != null ? (
          <Text style={styles.mapSet}>Map pin set ✓</Text>
        ) : (
          // TODO: Google Maps integration is Phase 2
          <Pressable style={styles.dashedButton} onPress={() => Alert.alert('Map pin', 'Map pin coming soon')}>
            <Feather name="map-pin" size={20} color={colors.gray400} />
            <Text style={styles.dashedButtonText}>Add map pin</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

function MoneyInput({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View>
        <Text style={styles.nairaPrefix}>₦</Text>
        <TextInput
          style={[styles.input, styles.moneyInput]}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          keyboardType="numeric"
        />
      </View>
    </View>
  );
}

function Step6() {
  const s = useListingFormStore();
  const freqOptions = [
    { value: 'per_annum', label: 'Per year', show: true },
    { value: 'per_month', label: 'Per month', show: true },
    { value: 'per_night', label: 'Per night', show: s.purpose === 'shortlet' },
    { value: 'outright', label: 'Outright', show: s.purpose === 'sale' },
  ].filter((o) => o.show);

  return (
    <>
      <Text style={styles.headline}>Set your price</Text>

      <MoneyInput label="Asking price (₦)" value={s.price} onChangeText={(t) => s.setField('price', t)} placeholder="0" />
      <Text style={styles.pricePreview}>{formatPrice(parseFloat(s.price) || 0)}</Text>

      <View style={styles.gapTop20}>
        <SectionLabel text="Payment period" />
        <View style={styles.pillWrap}>
          {freqOptions.map((o) => (
            <Pill key={o.value} label={o.label} selected={s.payment_frequency === o.value} onPress={() => s.setField('payment_frequency', o.value)} />
          ))}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.flexShrink}>
          <Text style={styles.toggleTitle}>Price is negotiable</Text>
          <Text style={styles.toggleSub}>Buyers/renters can negotiate</Text>
        </View>
        <Switch
          value={s.price_negotiable}
          onValueChange={(v) => s.setField('price_negotiable', v)}
          trackColor={{ false: colors.gray200, true: colors.blue600 }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.gapTop24}>
        <SectionLabel text="Inspection fee" />
        <Text style={styles.inspectionHint}>
          This is held in escrow and released to you after a successful inspection. You keep 100% —
          DenHunt takes no cut.
        </Text>
        <View style={styles.escrowBanner}>
          <Feather name="shield" size={14} color={colors.blue600} />
          <Text style={styles.escrowText}>Protected by DenHunt Escrow</Text>
        </View>
        <MoneyInput label="Inspection fee (₦)" value={s.inspection_fee} onChangeText={(t) => s.setField('inspection_fee', t)} placeholder="e.g. 5000" />
      </View>

      <View style={styles.gapTop24}>
        <SectionLabel text="Additional fees (optional)" />
        <View style={styles.feeRow}>
          <View style={styles.flex}>
            <LabeledInput label="Caution fee" value={s.caution_fee} onChangeText={(t) => s.setField('caution_fee', t)} placeholder="e.g. 2 months" />
          </View>
          <View style={styles.flex}>
            <LabeledInput label="Agency fee" value={s.agency_fee} onChangeText={(t) => s.setField('agency_fee', t)} placeholder="e.g. 10%" />
          </View>
        </View>
        <MoneyInput label="Annual service charge (₦)" value={s.service_charge} onChangeText={(t) => s.setField('service_charge', t)} placeholder="0" />
      </View>
    </>
  );
}

function Step7({ onPickDate }: { onPickDate: (which: 'from' | 'until') => void }) {
  const s = useListingFormStore();
  return (
    <>
      <Text style={styles.headline}>Availability</Text>

      <View style={styles.field}>
        <Text style={styles.inputLabel}>Available from</Text>
        <Pressable style={styles.selectField} onPress={() => onPickDate('from')}>
          <Text style={s.available_from ? styles.selectValue : styles.selectPlaceholder}>
            {s.available_from ? formatDate(s.available_from) : 'Select date'}
          </Text>
          <Feather name="calendar" size={16} color={colors.gray400} />
        </Pressable>
      </View>

      {s.purpose === 'shortlet' ? (
        <View style={styles.field}>
          <Text style={styles.inputLabel}>Available until (optional)</Text>
          <Pressable style={styles.selectField} onPress={() => onPickDate('until')}>
            <Text style={s.available_until ? styles.selectValue : styles.selectPlaceholder}>
              {s.available_until ? formatDate(s.available_until) : 'Select date'}
            </Text>
            <Feather name="calendar" size={16} color={colors.gray400} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.gapTop20}>
        <SectionLabel text="Current status" />
        <View style={styles.occupancyList}>
          {OCCUPANCY.map((o) => {
            const selected = s.occupancy_status === o.value;
            return (
              <Pressable
                key={o.value}
                style={[styles.occupancyCard, selected && styles.occupancyCardSelected]}
                onPress={() => s.setField('occupancy_status', o.value)}>
                <Feather name={o.icon} size={20} color={o.color} />
                <View style={styles.flexShrink}>
                  <Text style={styles.occupancyLabel}>{o.label}</Text>
                  <Text style={styles.occupancySub}>{o.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

function SummaryBlock({ label, step, children }: { label: string; step: number; children: React.ReactNode }) {
  const setStep = useListingFormStore((st) => st.setStep);
  return (
    <View style={styles.summaryBlock}>
      <View style={styles.summaryHead}>
        <SectionLabel text={label} />
        <Pressable style={styles.editLink} onPress={() => setStep(step)}>
          <Feather name="edit-2" size={14} color={colors.blue600} />
          <Text style={styles.editLinkText}>Edit</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Step8() {
  const s = useListingFormStore();
  const catLabel = CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category ?? '';
  const purpLabel = PURPOSES.find((p) => p.value === s.purpose)?.label ?? s.purpose ?? '';
  return (
    <>
      <Text style={styles.headline}>Review your listing</Text>
      <Text style={styles.subtext}>Check everything before submitting for review.</Text>

      <SummaryBlock label="Photos" step={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryThumbs}>
          {s.photos.map((p) => (
            <Image key={p.localUri} source={{ uri: p.localUri }} style={styles.summaryThumb} />
          ))}
        </ScrollView>
        <Text style={styles.summaryText}>
          {s.photos.length} photos{s.video ? ' · 1 video' : ''}
        </Text>
      </SummaryBlock>

      <SummaryBlock label="Property type" step={1}>
        <Text style={styles.summaryText}>
          {catLabel} · {purpLabel}
        </Text>
      </SummaryBlock>

      <SummaryBlock label="Details" step={3}>
        <Text style={styles.summaryStrong}>{s.title || 'Untitled listing'}</Text>
        <Text style={styles.summaryText}>
          {[s.bedrooms != null ? `${s.bedrooms} bed` : null, s.bathrooms != null ? `${s.bathrooms} bath` : null, s.size_sqm ? `${s.size_sqm} sqm` : null]
            .filter(Boolean)
            .join(' · ') || '—'}
        </Text>
      </SummaryBlock>

      <SummaryBlock label="Location" step={5}>
        <Text style={styles.summaryText}>{[s.area, s.lga, s.state_].filter(Boolean).join(', ')}</Text>
        {s.show_exact_address && s.street_address ? (
          <Text style={styles.summaryText}>{s.street_address}</Text>
        ) : null}
      </SummaryBlock>

      <SummaryBlock label="Price" step={6}>
        <Text style={styles.summaryStrong}>{formatPrice(parseFloat(s.price) || 0)}</Text>
        <Text style={styles.summaryText}>Inspection fee: {formatPrice(parseFloat(s.inspection_fee) || 0)}</Text>
        {s.price_negotiable ? <Text style={styles.summaryText}>Negotiable</Text> : null}
      </SummaryBlock>

      <SummaryBlock label="Availability" step={7}>
        <Text style={styles.summaryText}>Available from {s.available_from ? formatDate(s.available_from) : '—'}</Text>
        <Text style={styles.summaryText}>{OCCUPANCY.find((o) => o.value === s.occupancy_status)?.label ?? '—'}</Text>
      </SummaryBlock>

      <SummaryBlock label="Amenities" step={4}>
        <Text style={styles.summaryText}>{s.amenities.length} amenities selected</Text>
      </SummaryBlock>

      <View style={styles.submissionNote}>
        <Feather name="info" size={16} color={colors.blue600} />
        <Text style={styles.submissionNoteText}>
          Your listing will be reviewed by DenHunt within 24 hours. You&apos;ll be notified when it
          goes live.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  flexShrink: { flex: 1 },
  loadingBody: { padding: 20, gap: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900 },
  saveDraft: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600 },

  stepContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  headline: { fontFamily: fonts.bold, fontSize: 22, color: colors.gray900, letterSpacing: -0.3, marginBottom: 6 },
  subtext: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, lineHeight: 20, marginBottom: 24 },
  gapTop20: { marginTop: 20 },
  gapTop24: { marginTop: 24 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  catCard: {
    flexGrow: 1,
    flexBasis: '47%',
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  catCardSelected: { backgroundColor: colors.blue50, borderColor: colors.blue600 },
  catLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray700, textAlign: 'center' },
  catLabelSelected: { color: colors.blue600 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photoCell: { width: '48%', height: 110, borderRadius: 12, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  photoErrorOverlay: { backgroundColor: 'rgba(220,0,0,0.3)' },
  photoDelete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOrder: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  photoOrderText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.white, textAlign: 'center' },
  photoCover: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoCoverText: { fontFamily: fonts.medium, fontSize: 10, color: colors.white },
  addPhoto: {
    width: '48%',
    height: 110,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, marginTop: 6 },
  countMsg: { fontFamily: fonts.regular, fontSize: 12, marginTop: 8 },
  reorderNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 6, textAlign: 'center' },
  videoHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 4, marginBottom: 10 },
  addVideo: {
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addVideoText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray500 },
  videoAdded: {
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.blue900,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  videoAddedText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white },

  field: { marginTop: 16 },
  inputLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray500, marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  inputMultiline: { height: 100 },
  counter: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 4, textAlign: 'right' },
  moneyInput: { paddingLeft: 28 },
  nairaPrefix: { position: 'absolute', left: 12, top: 13, zIndex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.gray900 },
  pricePreview: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 6 },

  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  selectValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray900 },
  selectPlaceholder: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  toggleTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray900 },
  toggleSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
  toggleHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 4 },

  dashedButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  dashedButtonText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray500 },
  mapSet: { fontFamily: fonts.medium, fontSize: 14, color: colors.successText, marginTop: 10 },

  inspectionHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, lineHeight: 17, marginTop: 4, marginBottom: 10 },
  escrowBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.blue50, borderRadius: 10, padding: 12, marginBottom: 4 },
  escrowText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue800 },
  feeRow: { flexDirection: 'row', gap: 12 },

  amenityCount: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600, marginTop: 16 },

  occupancyList: { gap: 8, marginTop: 10 },
  occupancyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  occupancyCardSelected: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  occupancyLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  occupancySub: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },

  summaryBlock: { marginBottom: 16 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600 },
  summaryThumbs: { gap: 6 },
  summaryThumb: { width: 48, height: 48, borderRadius: 8 },
  summaryText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700, marginTop: 4 },
  summaryStrong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  submissionNote: { flexDirection: 'row', gap: 10, backgroundColor: colors.blue50, borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 8 },
  submissionNoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.blue800, lineHeight: 18 },

  bottomBar: { borderTopWidth: 1, borderTopColor: colors.gray100, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.white },
  bottomRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  secondaryButton: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
  ghostButton: { paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  ghostButtonText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray900 },
  disabled: { opacity: 0.4 },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.gray900, letterSpacing: -0.3, marginTop: 24 },
  successBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, lineHeight: 22, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  successButton: { alignSelf: 'stretch' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, paddingBottom: 28 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 12 },
  sheetItemText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray900 },

  dateBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dateSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dateHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    alignSelf: 'center',
    marginBottom: 8,
  },
  dateTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.gray900,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  iosPicker: { alignSelf: 'stretch' },
  dateDone: {
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  dateDoneText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});

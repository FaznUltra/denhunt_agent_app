import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ListingDetail, ListingMedia } from '@/types/listings';

export type LocalPhoto = {
  localUri: string;
  remoteUrl: string | null;
  mediaId: string | null;
  orderIndex: number;
  uploading: boolean;
  uploadError: boolean;
};

export type LocalVideo = {
  localUri: string;
  remoteUrl: string | null;
  mediaId: string | null;
  uploading: boolean;
  uploadError: boolean;
};

type ListingFormData = {
  // meta
  listingId: string | null;
  currentStep: number;
  isDirty: boolean;
  isSaving: boolean;

  // step 1 — category
  category: string | null;
  purpose: string | null;

  // step 2 — media
  photos: LocalPhoto[];
  video: LocalVideo | null;

  // step 3 — details
  title: string;
  description: string;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  furnishing: string | null;
  floor: string | null;
  size_sqm: string;
  year_built: string;
  parking: string | null;
  land_size: string;

  // step 4 — amenities
  amenities: string[];

  // step 5 — location
  state_: string | null;
  lga: string | null;
  area: string;
  street_address: string;
  show_exact_address: boolean;
  latitude: number | null;
  longitude: number | null;

  // step 6 — pricing
  price: string;
  payment_frequency: string | null;
  caution_fee: string;
  agency_fee: string;
  service_charge: string;
  price_negotiable: boolean;
  inspection_fee: string;

  // step 7 — availability
  available_from: string | null;
  available_until: string | null;
  occupancy_status: string | null;
};

type ListingFormActions = {
  setStep: (step: number) => void;
  setField: <K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => void;
  addPhoto: (photo: LocalPhoto) => void;
  updatePhoto: (localUri: string, patch: Partial<LocalPhoto>) => void;
  removePhoto: (localUri: string) => void;
  reorderPhotos: (from: number, to: number) => void;
  setVideo: (video: LocalVideo | null) => void;
  toggleAmenity: (amenity: string) => void;
  setListingId: (id: string) => void;
  setSaving: (v: boolean) => void;
  setDirty: (v: boolean) => void;
  loadFromListing: (listing: ListingDetail, media: ListingMedia[]) => void;
  reset: () => void;
};

export type ListingFormState = ListingFormData & ListingFormActions;

const initialData: ListingFormData = {
  listingId: null,
  currentStep: 1,
  isDirty: false,
  isSaving: false,

  category: null,
  purpose: null,

  photos: [],
  video: null,

  title: '',
  description: '',
  bedrooms: null,
  bathrooms: null,
  toilets: null,
  furnishing: null,
  floor: null,
  size_sqm: '',
  year_built: '',
  parking: null,
  land_size: '',

  amenities: [],

  state_: null,
  lga: null,
  area: '',
  street_address: '',
  show_exact_address: false,
  latitude: null,
  longitude: null,

  price: '',
  payment_frequency: null,
  caution_fee: '',
  agency_fee: '',
  service_charge: '',
  price_negotiable: false,
  inspection_fee: '',

  available_from: null,
  available_until: null,
  occupancy_status: null,
};

export const useListingFormStore = create<ListingFormState>()(
  persist(
    (set, get) => ({
      ...initialData,

      setStep: (currentStep) => set({ currentStep }),
      setField: (key, value) => set({ [key]: value } as unknown as Partial<ListingFormState>),
      addPhoto: (photo) => set({ photos: [...get().photos, photo], isDirty: true }),
      updatePhoto: (localUri, patch) =>
        set({
          photos: get().photos.map((p) => (p.localUri === localUri ? { ...p, ...patch } : p)),
        }),
      removePhoto: (localUri) =>
        set({
          photos: get()
            .photos.filter((p) => p.localUri !== localUri)
            .map((p, i) => ({ ...p, orderIndex: i })),
          isDirty: true,
        }),
      reorderPhotos: (from, to) => {
        const photos = [...get().photos];
        const [moved] = photos.splice(from, 1);
        photos.splice(to, 0, moved);
        set({ photos: photos.map((p, i) => ({ ...p, orderIndex: i })), isDirty: true });
      },
      setVideo: (video) => set({ video, isDirty: true }),
      toggleAmenity: (amenity) => {
        const amenities = get().amenities;
        set({
          amenities: amenities.includes(amenity)
            ? amenities.filter((a) => a !== amenity)
            : [...amenities, amenity],
          isDirty: true,
        });
      },
      setListingId: (listingId) => set({ listingId }),
      setSaving: (isSaving) => set({ isSaving }),
      setDirty: (isDirty) => set({ isDirty }),

      loadFromListing: (listing, media) =>
        set({
          listingId: listing.id,
          category: listing.category || null,
          purpose: listing.purpose || null,
          title: listing.title ?? '',
          description: listing.description ?? '',
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          toilets: null,
          furnishing: listing.furnishing,
          floor: listing.floor,
          size_sqm: listing.size_sqm != null ? String(listing.size_sqm) : '',
          year_built: listing.year_built != null ? String(listing.year_built) : '',
          parking: listing.parking,
          land_size: listing.land_size ?? '',
          amenities: listing.amenities ?? [],
          state_: listing.state,
          lga: null,
          area: listing.area ?? '',
          street_address: listing.street_address ?? '',
          show_exact_address: listing.show_exact_address,
          latitude: listing.latitude,
          longitude: listing.longitude,
          price: listing.price ? String(listing.price) : '',
          payment_frequency: listing.payment_frequency || null,
          caution_fee: listing.caution_fee ?? '',
          agency_fee: listing.agency_fee ?? '',
          service_charge: listing.service_charge != null ? String(listing.service_charge) : '',
          price_negotiable: listing.price_negotiable,
          inspection_fee: listing.inspection_fee != null ? String(listing.inspection_fee) : '',
          available_from: listing.available_from,
          available_until: listing.available_until,
          occupancy_status: listing.occupancy_status,
          photos: media
            .filter((m) => m.type === 'photo')
            .sort((a, b) => a.order_index - b.order_index)
            .map((m) => ({
              localUri: m.url,
              remoteUrl: m.url,
              mediaId: m.id,
              orderIndex: m.order_index,
              uploading: false,
              uploadError: false,
            })),
          video: (() => {
            const v = media.find((m) => m.type === 'video');
            return v
              ? { localUri: v.url, remoteUrl: v.url, mediaId: v.id, uploading: false, uploadError: false }
              : null;
          })(),
          isDirty: false,
        }),

      reset: () => set({ ...initialData }),
    }),
    {
      name: 'denhunt-listing-form',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist transient flags.
      partialize: ({ isSaving, ...rest }) => rest,
    },
  ),
);

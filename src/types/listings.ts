// Listing types for the listings index/detail screens.

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'rented_sold'
  | 'rejected'
  | 'expired';

export type Listing = {
  id: string;
  title: string;
  price: number;
  payment_frequency: string;
  status: ListingStatus;
  category: string;
  purpose: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: string | null;
  state: string | null;
  enquiries_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  rejection_reason: string | null;
  agency_id: string | null;
  cover_photo_url: string | null;
  // Only populated for the agency-admin view.
  posted_by_name: string | null;
};

export type ListingDetail = Listing & {
  description: string | null;
  furnishing: string | null;
  floor: string | null;
  size_sqm: number | null;
  year_built: number | null;
  parking: string | null;
  land_size: string | null;
  amenities: string[];
  street_address: string | null;
  show_exact_address: boolean;
  latitude: number | null;
  longitude: number | null;
  caution_fee: string | null;
  agency_fee: string | null;
  service_charge: number | null;
  price_negotiable: boolean;
  available_from: string | null;
  available_until: string | null;
  occupancy_status: string | null;
  inspection_fee: number | null;
  posted_by: string;
};

// Trimmed listing shape for contexts that only need a summary (e.g. the
// enquiry detail's "Enquiry about" card).
export type ListingDetailLight = {
  id: string;
  title: string;
  price: number;
  payment_frequency: string;
  status: ListingStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  area: string | null;
  state: string | null;
  category: string;
  inspection_fee: number | null;
  cover_photo_url: string | null;
};

export type ListingMedia = {
  id: string;
  url: string;
  type: 'photo' | 'video';
  order_index: number;
};

export type EnquiryPreview = {
  id: string;
  enquirer_name: string;
  enquirer_phone: string;
  message: string | null;
  preferred_inspection_date: string | null;
  status: string;
  created_at: string;
};

// DenHunt database types — modelled from the schema in
// docs/DenHunt_Agent_PRD_v1.1.md (Section 10 + Section 17).
// All tables use uuid PKs and timestamptz (ISO string) timestamps.

// ---- Enums / union types ----
export type UserRole =
  | 'individual_agent'
  | 'agency_admin'
  | 'agency_agent'
  | 'renter'
  | 'personal_inspector'
  | 'admin';

export type UserStatus = 'pending' | 'active' | 'suspended' | 'banned';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type AgencyVerificationStatus = 'pending' | 'verified' | 'rejected';
export type AgencyStatus = 'active' | 'suspended' | 'banned';

export type AgencyMemberStatus = 'invited' | 'active' | 'removed';

export type ListingCategory =
  | 'apartment'
  | 'self_con'
  | 'mini_flat'
  | 'duplex'
  | 'bungalow'
  | 'mansion'
  | 'room_parlour'
  | 'single_room'
  | 'commercial'
  | 'land'
  | 'shortlet';

export type ListingPurpose = 'rent' | 'sale' | 'shortlet';
export type Furnishing = 'unfurnished' | 'semi' | 'furnished';
export type PaymentFrequency = 'per_annum' | 'per_month' | 'per_night' | 'outright';
export type OccupancyStatus = 'vacant' | 'occupied' | 'renovation';
export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'rented_sold'
  | 'rejected'
  | 'expired';

export type MediaType = 'photo' | 'video';

export type SubscriptionPlan = 'starter' | 'pro' | 'agency_starter' | 'agency_growth';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'inspection_scheduled'
  | 'closed'
  | 'not_interested';

export type IdType = 'nin' | 'drivers_licence' | 'passport' | 'voters_card';
export type KycStatus = 'pending' | 'passed' | 'failed';

export type InspectionSessionStatus =
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type EvidenceSubmittedBy = 'agent' | 'renter';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_agent_fault'
  | 'resolved_renter_fault'
  | 'inconclusive';

export type PersonalInspectionStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'report_submitted'
  | 'approved'
  | 'delivered'
  | 'failed';

export type AreaReportStatus = 'draft' | 'under_review' | 'published' | 'outdated';
export type SearchRequestStatus = 'open' | 'matched' | 'expired' | 'cancelled';

// ---- Row types (Section 10) ----
export type User = {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  profile_photo_url: string | null;
  role: UserRole;
  status: UserStatus;
  verification_status: VerificationStatus;
  years_experience: string | null;
  areas: string[] | null;
  property_types: string[] | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export type Agency = {
  id: string;
  admin_id: string;
  name: string;
  cac_number: string | null;
  logo_url: string | null;
  office_address: string | null;
  website: string | null;
  subscription_plan: string | null;
  verification_status: AgencyVerificationStatus;
  status: AgencyStatus;
  created_at: string;
}

export type AgencyMember = {
  id: string;
  agency_id: string;
  user_id: string;
  invite_token: string;
  invite_expires_at: string;
  status: AgencyMemberStatus;
  joined_at: string | null;
}

export type Listing = {
  id: string;
  posted_by: string;
  agency_id: string | null;
  title: string;
  description: string;
  category: ListingCategory;
  purpose: ListingPurpose;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  furnishing: Furnishing;
  floor: string | null;
  size_sqm: number | null;
  year_built: number | null;
  parking: string | null;
  land_size: string | null;
  amenities: string[] | null;
  state: string;
  lga: string;
  area: string;
  street_address: string | null;
  show_exact_address: boolean;
  latitude: number | null;
  longitude: number | null;
  price: number;
  payment_frequency: PaymentFrequency;
  caution_fee: string | null;
  agency_fee: string | null;
  service_charge: number | null;
  price_negotiable: boolean;
  available_from: string;
  available_until: string | null;
  occupancy_status: OccupancyStatus;
  status: ListingStatus;
  rejection_reason: string | null;
  views_count: number;
  enquiries_count: number;
  inspection_fee: number | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ListingMedia = {
  id: string;
  listing_id: string;
  type: MediaType;
  url: string;
  order_index: number; // 0 = cover photo
  created_at: string;
}

export type Subscription = {
  id: string;
  user_id: string;
  agency_id: string | null;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  paystack_customer_id: string | null;
  paystack_subscription_code: string | null;
  created_at: string;
}

export type Enquiry = {
  id: string;
  listing_id: string;
  agent_id: string;
  enquirer_name: string;
  enquirer_phone: string;
  enquirer_email: string | null;
  message: string | null;
  preferred_inspection_date: string | null;
  status: EnquiryStatus;
  created_at: string;
}

export type IdentityVerification = {
  id: string;
  user_id: string;
  id_type: IdType;
  id_front_url: string;
  id_back_url: string | null;
  bvn: string; // encrypted at rest
  kyc_provider_ref: string | null;
  kyc_status: KycStatus;
  kyc_result: Record<string, unknown> | null;
  reviewed_by: string | null;
  created_at: string;
}

// ---- Row types (Section 6.5 / 17 — escrow-gated chat + inspection escrow) ----
// Status drives the escrow-gated chat flow (PRD §6.5).
export type SessionStatus =
  | 'scheduled'
  | 'reschedule_pending'
  | 'escrow_held'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type ProposedBy = 'agent' | 'renter';

export type InspectionSession = {
  id: string;
  enquiry_id: string | null;
  listing_id: string;
  agent_id: string;
  renter_id: string | null;
  renter_name: string;
  inspection_fee: number;
  inspection_code: string | null;
  scheduled_date: string | null;
  status: SessionStatus;
  proposed_date: string | null;
  proposed_by: ProposedBy | null;
  chat_unlocked: boolean;
  code_confirmed_at: string | null;
  escrow_release_at: string | null;
  last_message: string | null;
  last_message_at: string | null;
  paystack_reference: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageSenderRole = 'agent' | 'renter' | 'system';
export type MessageType = 'text' | 'image' | 'system';

export type Message = {
  id: string;
  session_id: string;
  sender_role: MessageSenderRole;
  sender_id: string | null;
  type: MessageType;
  body: string | null;
  image_url: string | null;
  reply_to: string | null;
  created_at: string;
  read_at: string | null;
}

export type InspectionEvidence = {
  id: string;
  session_id: string;
  submitted_by: EvidenceSubmittedBy;
  type: MediaType;
  url: string;
  uploaded_at: string;
}

export type Dispute = {
  id: string;
  session_id: string;
  raised_by: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type PersonalInspectionRequest = {
  id: string;
  listing_id: string;
  renter_id: string;
  assigned_inspector_id: string | null;
  fee_paid: number;
  inspector_payout: number | null;
  status: PersonalInspectionStatus;
  report_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AreaReport = {
  id: string;
  area_name: string;
  state: string;
  lga: string;
  inspector_id: string;
  price: number;
  status: AreaReportStatus;
  visited_at: string | null;
  published_at: string | null;
  report_data: Record<string, unknown> | null;
  media: unknown[] | null;
  created_at?: string;
}

export type RenterSearchRequest = {
  id: string;
  renter_id: string;
  property_type: string;
  preferred_locations: string[];
  max_budget: number;
  bedrooms: number;
  move_in_date: string;
  must_have_amenities: string[];
  notes: string | null;
  fee_paid: number;
  status: SearchRequestStatus;
  matched_listing_ids: string[] | null;
  expires_at: string;
  created_at: string;
}

// ---- Supabase Database helper type ----
// Minimal shape so `createClient<Database>` gives typed table access.
type TableConfig<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: TableConfig<User>;
      agencies: TableConfig<Agency>;
      agency_members: TableConfig<AgencyMember>;
      listings: TableConfig<Listing>;
      listing_media: TableConfig<ListingMedia>;
      subscriptions: TableConfig<Subscription>;
      enquiries: TableConfig<Enquiry>;
      identity_verifications: TableConfig<IdentityVerification>;
      inspection_sessions: TableConfig<InspectionSession>;
      messages: TableConfig<Message>;
      inspection_evidence: TableConfig<InspectionEvidence>;
      disputes: TableConfig<Dispute>;
      personal_inspection_requests: TableConfig<PersonalInspectionRequest>;
      area_reports: TableConfig<AreaReport>;
      renter_search_requests: TableConfig<RenterSearchRequest>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

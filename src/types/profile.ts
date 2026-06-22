import type { UserRole } from '@/types/database';

export type AgentProfile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  profile_photo_url: string | null;
  role: UserRole;
  status: string;
  verification_status: string;
  years_experience: string | null;
  areas: string[];
  property_types: string[];
  bio: string | null;
  created_at: string;
};

export type AgencyProfile = {
  id: string;
  name: string;
  logo_url: string | null;
  cac_number: string | null;
  verification_status: string;
  subscription_plan: string | null;
};

export type SubscriptionInfo = {
  plan: string;
  billing_cycle: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export type ProfileStats = {
  active_listings_count: number;
  total_enquiries_count: number;
};

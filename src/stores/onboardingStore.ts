import { create } from 'zustand';
import type { UserRole } from '@/types/database';

// Roles a user can self-register as. agency_agent is not selectable — it is
// derived from an invite token (see inviteToken) during account creation.
export type OnboardingRole = Extract<UserRole, 'individual_agent' | 'agency_admin'>;

// Holds onboarding answers across the 6-step flow so we don't thread every
// value through router params. See PRD Section 3 (Onboarding Flows).
interface OnboardingState {
  role: OnboardingRole | null;
  phone: string | null;
  fullName: string | null;
  email: string | null;
  profilePhotoUri: string | null;
  areas: string[];
  propertyTypes: string[];
  yearsExperience: string | null;
  // Agency-specific (agency_admin only).
  agencyName: string | null;
  cacNumber: string | null;
  // Identity verification (step 6).
  idType: string | null;
  idFrontUri: string | null;
  idBackUri: string | null;
  bvn: string | null;
  // Agency invite (agency_agent joining via link).
  inviteToken: string | null;

  setRole: (role: OnboardingRole) => void;
  setPhone: (phone: string) => void;
  setFullName: (fullName: string) => void;
  setEmail: (email: string) => void;
  setProfilePhotoUri: (profilePhotoUri: string | null) => void;
  setAreas: (areas: string[]) => void;
  setPropertyTypes: (propertyTypes: string[]) => void;
  setYearsExperience: (yearsExperience: string) => void;
  setAgencyName: (agencyName: string) => void;
  setCacNumber: (cacNumber: string) => void;
  setIdType: (idType: string) => void;
  setIdFrontUri: (idFrontUri: string | null) => void;
  setIdBackUri: (idBackUri: string | null) => void;
  setBvn: (bvn: string) => void;
  setInviteToken: (inviteToken: string | null) => void;
  reset: () => void;
}

const initialState = {
  role: null,
  phone: null,
  fullName: null,
  email: null,
  profilePhotoUri: null,
  areas: [],
  propertyTypes: [],
  yearsExperience: null,
  agencyName: null,
  cacNumber: null,
  idType: null,
  idFrontUri: null,
  idBackUri: null,
  bvn: null,
  inviteToken: null,
} satisfies Partial<OnboardingState>;

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setRole: (role) => set({ role }),
  setPhone: (phone) => set({ phone }),
  setFullName: (fullName) => set({ fullName }),
  setEmail: (email) => set({ email }),
  setProfilePhotoUri: (profilePhotoUri) => set({ profilePhotoUri }),
  setAreas: (areas) => set({ areas }),
  setPropertyTypes: (propertyTypes) => set({ propertyTypes }),
  setYearsExperience: (yearsExperience) => set({ yearsExperience }),
  setAgencyName: (agencyName) => set({ agencyName }),
  setCacNumber: (cacNumber) => set({ cacNumber }),
  setIdType: (idType) => set({ idType }),
  setIdFrontUri: (idFrontUri) => set({ idFrontUri }),
  setIdBackUri: (idBackUri) => set({ idBackUri }),
  setBvn: (bvn) => set({ bvn }),
  setInviteToken: (inviteToken) => set({ inviteToken }),
  reset: () => set(initialState),
}));

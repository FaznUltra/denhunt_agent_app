import { create } from 'zustand';
import type { UserRole } from '@/types/database';

// Roles a user can self-register as (agency_agent joins by invite only).
export type OnboardingRole = Extract<UserRole, 'individual_agent' | 'agency_admin'>;

// Holds onboarding answers across the 6-step flow so we don't thread every
// value through router params. See PRD Section 3 (Onboarding Flows).
interface OnboardingState {
  role: OnboardingRole | null;
  phone: string | null;
  fullName: string | null;
  profilePhotoUri: string | null;
  areas: string[];
  propertyTypes: string[];

  setRole: (role: OnboardingRole) => void;
  setPhone: (phone: string) => void;
  setFullName: (fullName: string) => void;
  setProfilePhotoUri: (profilePhotoUri: string | null) => void;
  setAreas: (areas: string[]) => void;
  setPropertyTypes: (propertyTypes: string[]) => void;
  reset: () => void;
}

const initialState = {
  role: null,
  phone: null,
  fullName: null,
  profilePhotoUri: null,
  areas: [],
  propertyTypes: [],
} satisfies Partial<OnboardingState>;

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setRole: (role) => set({ role }),
  setPhone: (phone) => set({ phone }),
  setFullName: (fullName) => set({ fullName }),
  setProfilePhotoUri: (profilePhotoUri) => set({ profilePhotoUri }),
  setAreas: (areas) => set({ areas }),
  setPropertyTypes: (propertyTypes) => set({ propertyTypes }),
  reset: () => set(initialState),
}));

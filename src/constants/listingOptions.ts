import type Feather from '@expo/vector-icons/Feather';

type FeatherName = keyof typeof Feather.glyphMap;

export const CATEGORIES: { value: string; label: string; icon: FeatherName }[] = [
  { value: 'apartment', label: 'Apartment / Flat', icon: 'home' },
  { value: 'self_con', label: 'Self-contained', icon: 'square' },
  { value: 'mini_flat', label: 'Mini flat', icon: 'minimize-2' },
  { value: 'duplex', label: 'Duplex / Terrace', icon: 'layers' },
  { value: 'bungalow', label: 'Bungalow', icon: 'home' },
  { value: 'mansion', label: 'Mansion / Detached', icon: 'maximize-2' },
  { value: 'room_parlour', label: 'Room & Parlour', icon: 'layout' },
  { value: 'single_room', label: 'Single room', icon: 'minus-square' },
  { value: 'commercial', label: 'Commercial', icon: 'briefcase' },
  { value: 'land', label: 'Land', icon: 'map' },
  { value: 'shortlet', label: 'Short-let', icon: 'calendar' },
];

export const PURPOSES: { value: string; label: string }[] = [
  { value: 'rent', label: 'For Rent' },
  { value: 'sale', label: 'For Sale' },
  { value: 'shortlet', label: 'Short-let' },
];

export const BEDROOM_OPTIONS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6+' },
];

export const COUNT_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5+' },
];

export const FURNISHING = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi', label: 'Semi-furnished' },
  { value: 'furnished', label: 'Fully furnished' },
];

export const FLOORS = [
  { value: 'ground', label: 'Ground' },
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '3rd', label: '3rd' },
  { value: '4th', label: '4th' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'na', label: 'N/A' },
];

export const PARKING = [
  { value: 'none', label: 'None' },
  { value: '1', label: '1 space' },
  { value: '2', label: '2 spaces' },
  { value: '3+', label: '3+' },
  { value: 'estate', label: 'Estate parking' },
];

export const OCCUPANCY: { value: string; label: string; sub: string; icon: FeatherName; color: string }[] = [
  { value: 'vacant', label: 'Vacant', sub: 'Ready to move in immediately', icon: 'check-circle', color: '#065F46' },
  { value: 'occupied', label: 'Occupied', sub: 'Notice has been given, moving out soon', icon: 'clock', color: '#92400E' },
  { value: 'renovation', label: 'Under renovation', sub: 'Will be ready after work is complete', icon: 'tool', color: '#1B4FDC' },
];

export const AMENITY_GROUPS: { label: string; items: { value: string; label: string }[] }[] = [
  {
    label: 'Power',
    items: [
      { value: '24hr_electricity', label: '24hr electricity' },
      { value: 'prepaid_meter', label: 'Prepaid meter' },
      { value: 'generator_backup', label: 'Generator backup' },
      { value: 'solar', label: 'Solar' },
      { value: 'phcn', label: 'PHCN' },
    ],
  },
  {
    label: 'Water',
    items: [
      { value: 'borehole', label: 'Borehole' },
      { value: 'overhead_tank', label: 'Overhead tank' },
      { value: 'running_water', label: 'Running water' },
      { value: 'well', label: 'Well' },
    ],
  },
  {
    label: 'Security',
    items: [
      { value: 'security_guard', label: 'Security guard' },
      { value: 'cctv', label: 'CCTV' },
      { value: 'gated_estate', label: 'Gated estate' },
      { value: 'fence', label: 'Fence' },
      { value: 'intercom', label: 'Intercom' },
    ],
  },
  {
    label: 'Facilities',
    items: [
      { value: 'swimming_pool', label: 'Swimming pool' },
      { value: 'gym', label: 'Gym' },
      { value: 'playground', label: 'Playground' },
      { value: 'event_hall', label: 'Event hall' },
      { value: 'laundry', label: 'Laundry' },
    ],
  },
  {
    label: 'Connectivity',
    items: [
      { value: 'fibre_internet', label: 'Fibre internet' },
      { value: 'cable_tv', label: 'Cable TV' },
    ],
  },
  {
    label: 'Other',
    items: [
      { value: 'serviced', label: 'Serviced apartment' },
      { value: 'boys_quarters', label: 'Boys quarters' },
      { value: 'pop_ceiling', label: 'POP ceiling' },
      { value: 'tiled_floors', label: 'Tiled floors' },
      { value: 'air_conditioning', label: 'Air conditioning' },
    ],
  },
];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

// Top LGAs per state for MVP; states without a list fall back to ['Other'].
export const LGAS_BY_STATE: Record<string, string[]> = {
  Lagos: [
    'Alimosho', 'Ajeromi-Ifelodun', 'Kosofe', 'Mushin', 'Oshodi-Isolo', 'Ojo', 'Ikorodu',
    'Surulere', 'Agege', 'Ikeja', 'Eti-Osa', 'Lagos Island', 'Lagos Mainland', 'Lekki',
    'Victoria Island', 'Apapa', 'Shomolu', 'Ifako-Ijaiye', 'Badagry', 'Other',
  ],
  'FCT (Abuja)': ['Abuja Municipal', 'Bwari', 'Gwagwalada', 'Kuje', 'Abaji', 'Kwali', 'Other'],
  Rivers: ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Okrika', 'Oyigbo', 'Other'],
  Oyo: ['Ibadan North', 'Ibadan South-West', 'Egbeda', 'Oluyole', 'Akinyele', 'Other'],
};

export function lgasForState(state: string | null): string[] {
  if (!state) return [];
  return LGAS_BY_STATE[state] ?? ['Other'];
}

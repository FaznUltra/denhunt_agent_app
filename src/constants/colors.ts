// DenHunt colour tokens — single source of truth.
// See docs/denhunt-design-system.md. Never hardcode hex values elsewhere.
export const colors = {
  blue50: '#EBF1FF',
  blue100: '#C3D4FC',
  blue200: '#92AEFA',
  blue400: '#4F7CF5',
  blue600: '#1B4FDC', // primary brand
  blue800: '#1338A0',
  blue900: '#0A1F6B',

  gray50: '#F6F7F9', // page bg
  gray100: '#F0F0F0', // dividers
  gray200: '#E5E7EB', // borders
  gray400: '#9CA3AF', // placeholder
  gray500: '#6B7280', // muted
  gray700: '#374151', // body
  gray900: '#0F1419', // headings

  successBg: '#ECFDF5',
  successText: '#065F46',
  warningBg: '#FFF4E0',
  warningText: '#92400E',
  errorBg: '#FEF2F2',
  errorText: '#991B1B',
  infoBg: '#EBF1FF',
  infoText: '#1B4FDC',

  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;

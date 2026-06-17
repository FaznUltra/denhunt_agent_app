// DenHunt spacing scale (base unit 4px) — see docs/denhunt-design-system.md.
export const spacing = {
  s1: 4, // icon-to-text gap, tight internal padding
  s2: 8, // component internal gap
  s3: 12, // compact card padding, gap between list items
  s4: 16, // standard padding, gap between sections
  s5: 20, // screen horizontal padding
  s6: 24, // section vertical gap
  s8: 32, // large section separation
} as const;

// Border radius scale.
export const radius = {
  sm: 8, // tags, badges, small chips
  md: 10, // input fields, small buttons
  lg: 12, // cards, standard buttons, stat blocks
  xl: 16, // listing cards, modals, bottom sheets
  '2xl': 24, // large feature cards
  full: 9999, // pills, avatar circles, status dots
} as const;

// Standard screen horizontal padding.
export const SCREEN_PADDING = spacing.s5;

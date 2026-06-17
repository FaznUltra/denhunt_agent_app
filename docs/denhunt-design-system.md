# DenHunt Design System
> Reference document for Claude Code. Use this file when building any DenHunt screen.
> Font: Inter. Mode: Light only. Platform: React Native (Expo SDK 54).

---

## How to use this file with Claude Code
Drop this file in your project root or a `/docs` folder. When starting a new screen, tell Claude Code:
```
refer to denhunt-design-system.md for all colours, typography, spacing, and component patterns
```

---

## Colour tokens

### Primary — DenHunt Blue
| Token | Hex | Usage |
|---|---|---|
| `blue-50` | `#EBF1FF` | Light tint backgrounds, info banners, badge fills |
| `blue-100` | `#C3D4FC` | Hover tints, subtle borders |
| `blue-200` | `#92AEFA` | Disabled states, light accents |
| `blue-400` | `#4F7CF5` | Secondary actions, links |
| `blue-600` | `#1B4FDC` | **Primary brand colour** — buttons, active nav, key UI |
| `blue-800` | `#1338A0` | Pressed states, dark accents |
| `blue-900` | `#0A1F6B` | Text on blue-50 backgrounds |

### Neutrals
| Token | Hex | Usage |
|---|---|---|
| `gray-50` | `#F6F7F9` | Page background, input backgrounds, stat cards |
| `gray-100` | `#F0F0F0` | Dividers, section separators |
| `gray-200` | `#E5E7EB` | Input borders (default), card borders |
| `gray-400` | `#9CA3AF` | Placeholder text, hint text, inactive nav |
| `gray-500` | `#6B7280` | Captions, labels, muted text |
| `gray-700` | `#374151` | Body text |
| `gray-900` | `#0F1419` | Headings, primary text (warm near-black) |

### Semantic
| Token | Hex (bg) | Hex (text) | Usage |
|---|---|---|---|
| `success` | `#ECFDF5` | `#065F46` | Verified, active, confirmed states |
| `warning` | `#FFF4E0` | `#92400E` | Pending, awaiting states |
| `error` | `#FEF2F2` | `#991B1B` | Rejected, failed, error states |
| `info` | `#EBF1FF` | `#1B4FDC` | Informational banners, tips |

### Never use
- Pure black `#000000` — use `gray-900` `#0F1419` instead
- Pure white `#FFFFFF` as a text colour
- Any colour not in this palette

---

## Typography

Font family: `Inter` (all weights). Import:
```js
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
```

### Type scale
| Name | Size | Weight | Letter spacing | Line height | Usage |
|---|---|---|---|---|---|
| `display` | 32px | 700 | -0.5px | 1.15 | Hero/splash screens only |
| `heading-1` | 24px | 700 | -0.3px | 1.2 | Screen titles |
| `heading-2` | 18px | 600 | -0.2px | 1.3 | Section headers, card titles |
| `heading-3` | 15px | 600 | 0px | 1.4 | Subsections, list item titles |
| `body` | 14px | 400 | 0px | 1.6 | All body text, descriptions |
| `caption` | 12px | 400 | 0px | 1.5 | Timestamps, secondary metadata |
| `label` | 11px | 600 | +0.05em | 1.4 | ALL CAPS section labels, field labels |
| `price` | 22px | 700 | -0.3px | 1.2 | Rental/sale prices only |
| `price-small` | 18px | 700 | -0.2px | 1.2 | Prices in compact cards |

### Typography rules
- **Headings**: always `gray-900` `#0F1419`
- **Body**: always `gray-700` `#374151`
- **Muted / captions**: always `gray-500` `#6B7280`
- **Labels (uppercase)**: always `gray-500` `#6B7280`
- **Price**: always `gray-900` unless in a coloured context
- **Text on blue-600**: always white `#FFFFFF`
- **Text on blue-50**: always `blue-900` `#0A1F6B`
- Never mix font weights within a single line unless one is a label
- Never use font weight below 400

---

## Spacing system

Base unit: 4px

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon-to-text gap, tight internal padding |
| `space-2` | 8px | Component internal gap (e.g. badge padding) |
| `space-3` | 12px | Card internal padding (compact), gap between list items |
| `space-4` | 16px | Standard padding, gap between sections |
| `space-5` | 20px | Screen horizontal padding |
| `space-6` | 24px | Section vertical gap |
| `space-8` | 32px | Large section separation |

### Screen layout
- Horizontal screen padding: `20px` on all screens
- Bottom safe area: always account for `SafeAreaView`
- Top status bar: handled by `SafeAreaView`
- Bottom nav bar height: `60px` + safe area inset

---

## Border radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 8px | Tags, badges, small chips, input inner elements |
| `radius-md` | 10px | Input fields, small buttons |
| `radius-lg` | 12px | Cards, standard buttons, stat blocks |
| `radius-xl` | 16px | Listing cards, modals, bottom sheets |
| `radius-2xl` | 24px | Large feature cards |
| `radius-full` | 9999px | Pills, avatar circles, status dots |

---

## Components

### Primary button
```js
// Style
{
  backgroundColor: '#1B4FDC',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 24,
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
}
// Label style
{
  fontFamily: 'Inter_600SemiBold',
  fontSize: 15,
  color: '#FFFFFF',
  letterSpacing: 0,
}
```

### Secondary button (outlined)
```js
{
  backgroundColor: '#FFFFFF',
  borderWidth: 1.5,
  borderColor: '#1B4FDC',
  borderRadius: 12,
  paddingVertical: 13,
  paddingHorizontal: 24,
  alignItems: 'center',
  width: '100%',
}
// Label
{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1B4FDC' }
```

### Ghost button
```js
{
  backgroundColor: '#F6F7F9',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 24,
  alignItems: 'center',
  width: '100%',
}
// Label
{ fontFamily: 'Inter_500Medium', fontSize: 15, color: '#0F1419' }
```

### Input field
```js
// Container
{
  borderWidth: 1.5,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  backgroundColor: '#FFFFFF',
}
// Text
{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#0F1419' }
// Placeholder colour: '#9CA3AF'
// Focus border: '#1B4FDC'
// Error border: '#991B1B'
```

### Input label
```js
{
  fontFamily: 'Inter_500Medium',
  fontSize: 12,
  color: '#6B7280',
  marginBottom: 5,
}
```

### Status badge
```js
// Active
{ bg: '#EBF1FF', text: '#1B4FDC' }
// Pending
{ bg: '#FFF4E0', text: '#92400E' }
// Verified
{ bg: '#ECFDF5', text: '#065F46' }
// Rejected
{ bg: '#FEF2F2', text: '#991B1B' }

// Common badge style
{
  paddingVertical: 4,
  paddingHorizontal: 10,
  borderRadius: 20,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
}
// Badge text
{ fontFamily: 'Inter_500Medium', fontSize: 12 }
```

### Listing card
```js
// Card container
{
  borderRadius: 16,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '#F0F0F0',
  backgroundColor: '#FFFFFF',
  marginBottom: 12,
}
// Image area: height 160px (full listing) or 130px (compact)
// Body padding: 12px 14px
// Price: Inter_700Bold, 18px, #0F1419
// Frequency label: Inter_400Regular, 12px, #6B7280
// Title: Inter_400Regular, 13px, #374151
// Meta row (beds/baths): Inter_400Regular, 12px, #9CA3AF, gap 12px
```

### Stat card
```js
// Container
{
  backgroundColor: '#F6F7F9',
  borderRadius: 12,
  padding: 12,
  paddingHorizontal: 14,
}
// Value
{ fontFamily: 'Inter_700Bold', fontSize: 22, color: '#0F1419' }
// Label
{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', marginTop: 2 }
// Grid: 2 columns, gap 8px
```

### Section divider
```js
// Full-width, sits between major page sections
{
  height: 6,
  backgroundColor: '#F6F7F9',
}
```

### Bottom navigation bar
```js
// Bar container
{
  flexDirection: 'row',
  justifyContent: 'space-around',
  paddingTop: 10,
  paddingBottom: 14, // + safe area
  borderTopWidth: 1,
  borderTopColor: '#F0F0F0',
  backgroundColor: '#FFFFFF',
}
// Nav item (inactive)
{ icon: 22px, color: '#9CA3AF', label: Inter_400Regular 10px #9CA3AF }
// Nav item (active)
{ icon: 22px, color: '#1B4FDC', label: Inter_600SemiBold 10px #1B4FDC }
// 5 items: Home, Listings, Post (+), Enquiries, Profile
```

### Avatar / initials circle
```js
{
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#EBF1FF',
  alignItems: 'center',
  justifyContent: 'center',
}
// Initials text
{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#1B4FDC' }
```

### Info banner (verification, notices)
```js
{
  backgroundColor: '#EBF1FF',
  borderRadius: 10,
  padding: 10,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
}
// Text
{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#1338A0' }
```

### Amenity chip
```js
{
  backgroundColor: '#F6F7F9',
  borderRadius: 8,
  paddingVertical: 5,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
}
// Text
{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#374151' }
```

---

## Screen patterns

### Standard screen header
```js
// Back button: 32x32, bg #FFFFFF, borderRadius 8, border 1px #E5E7EB
// Title: Inter_700Bold, 18px, #0F1419
// Right action (optional): icon button, same style as back button
// Header padding: 12px horizontal 20px, borderBottom 1px #F0F0F0
```

### Screen with sticky CTA
```js
// Bottom area (above nav bar)
{
  padding: 12,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderTopColor: '#F0F0F0',
  backgroundColor: '#FFFFFF',
}
// Always full-width primary button inside
```

### Empty state
```js
// Icon: 48px, color #9CA3AF, centered
// Title: Inter_600SemiBold, 16px, #0F1419, centered, marginTop 12
// Body: Inter_400Regular, 14px, #6B7280, centered, marginTop 6, maxWidth 260
// CTA: primary button, marginTop 20, width auto (not full-width)
```

### List item row
```js
// Container
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F0F0',
  backgroundColor: '#FFFFFF',
}
// Left icon: 20px, color #6B7280
// Title: Inter_500Medium, 14px, #0F1419
// Subtitle: Inter_400Regular, 12px, #6B7280
// Right chevron: ti-chevron-right, 16px, #9CA3AF
```

---

## Iconography

Icon library: `@expo/vector-icons` — use **Feather** or integrate **Tabler Icons**.

Sizes:
- `16px` — inline with text
- `20px` — standard UI icons (nav bar inactive, list rows)
- `22px` — bottom nav bar
- `24px` — section headers, feature icons
- `32px` — empty states, onboarding illustrations
- `48px` — hero/splash decorative

Colour rules:
- Default: `#6B7280`
- Active / primary: `#1B4FDC`
- On dark bg: `#FFFFFF`
- Destructive: `#991B1B`

Key icon mappings:
```
Home          → ti-home
Listings      → ti-building
Post listing  → ti-plus
Enquiries     → ti-message
Profile       → ti-user
Verified      → ti-shield-check
Calendar      → ti-calendar
Location      → ti-map-pin
Price         → ti-currency-naira
Beds          → ti-bed
Baths         → ti-bath
Video         → ti-video
Camera        → ti-camera
Inspection    → ti-circle-check
Dispute       → ti-alert-triangle
Escrow        → ti-lock
Timer         → ti-clock
```

---

## Inspection & escrow UI patterns

### Inspection countdown timer
```js
// Background
{ backgroundColor: '#F6F7F9', borderRadius: 12, padding: 14 }
// Label
{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#6B7280',
  letterSpacing: 0.05, textTransform: 'uppercase', marginBottom: 6 }
// Countdown digits
{ fontFamily: 'Inter_700Bold', fontSize: 32, color: '#0F1419', letterSpacing: -0.5 }
// Subtext
{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 2 }
```

### Code confirmation banner (success)
```js
{
  backgroundColor: '#ECFDF5',
  borderRadius: 12,
  padding: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}
// Title: Inter_600SemiBold, 13px, #065F46
// Subtitle: Inter_400Regular, 12px, #065F46, opacity 0.8
```

### Dispute alert banner
```js
{
  backgroundColor: '#FEF2F2',
  borderRadius: 12,
  padding: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}
// Title: Inter_600SemiBold, 13px, #991B1B
// Body: Inter_400Regular, 12px, #991B1B, opacity 0.8
```

### 6-digit OTP / inspection code input
```js
// 6 boxes, each 44x52px
// Box style (inactive): bg #F6F7F9, border 1.5px #E5E7EB, borderRadius 10
// Box style (filled): bg #FFFFFF, border 1.5px #1B4FDC, borderRadius 10
// Digit text: Inter_700Bold, 24px, #0F1419, textAlign center
// Gap between boxes: 8px
```

---

## Do's and don'ts

### Do
- Use Inter for every text element. No exceptions.
- Use `gray-900` `#0F1419` for all headings and primary text
- Use `blue-600` `#1B4FDC` for primary buttons, active states, and key actions only
- Keep 20px horizontal padding on all screens
- Always show verification status on agent profiles and listings
- Use the escrow/inspection colour system consistently (green = safe, red = dispute)
- Give every screen a single primary action (one primary button per screen)
- Use `#F6F7F9` as the page background — never pure white for the whole screen

### Don't
- Don't use gradients anywhere
- Don't use shadows (elevation) on standard cards — use borders instead
- Don't use more than 2 font weights on a single screen
- Don't use colours outside the palette
- Don't use border-radius values not in the radius scale
- Don't put more than one primary button on a screen
- Don't use pure black `#000000` for text
- Don't use font size below 11px
- Don't use light mode components for the agent app — light mode only, always

---

## File structure recommendation

```
/src
  /components
    /ui
      Button.tsx         → primary, secondary, ghost variants
      Input.tsx          → with label, error state
      Badge.tsx          → status badges
      ListingCard.tsx    → full and compact variants
      StatCard.tsx
      Avatar.tsx
      SectionLabel.tsx   → uppercase labels
  /screens
    /onboarding
    /listings
    /enquiries
    /inspection
    /profile
  /constants
    colors.ts            → all hex values as named constants
    typography.ts        → all type styles as StyleSheet objects
    spacing.ts           → spacing scale
  /docs
    denhunt-design-system.md   → this file
```

### colors.ts
```ts
export const colors = {
  blue50:  '#EBF1FF',
  blue100: '#C3D4FC',
  blue200: '#92AEFA',
  blue400: '#4F7CF5',
  blue600: '#1B4FDC',  // primary brand
  blue800: '#1338A0',
  blue900: '#0A1F6B',

  gray50:  '#F6F7F9',  // page bg
  gray100: '#F0F0F0',  // dividers
  gray200: '#E5E7EB',  // borders
  gray400: '#9CA3AF',  // placeholder
  gray500: '#6B7280',  // muted
  gray700: '#374151',  // body
  gray900: '#0F1419',  // headings

  successBg:   '#ECFDF5',
  successText: '#065F46',
  warningBg:   '#FFF4E0',
  warningText: '#92400E',
  errorBg:     '#FEF2F2',
  errorText:   '#991B1B',
  infoBg:      '#EBF1FF',
  infoText:    '#1B4FDC',

  white: '#FFFFFF',
} as const;
```

### typography.ts
```ts
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const type = StyleSheet.create({
  display:    { fontFamily: 'Inter_700Bold',      fontSize: 32, letterSpacing: -0.5, lineHeight: 37, color: colors.gray900 },
  heading1:   { fontFamily: 'Inter_700Bold',      fontSize: 24, letterSpacing: -0.3, lineHeight: 29, color: colors.gray900 },
  heading2:   { fontFamily: 'Inter_600SemiBold',  fontSize: 18, letterSpacing: -0.2, lineHeight: 23, color: colors.gray900 },
  heading3:   { fontFamily: 'Inter_600SemiBold',  fontSize: 15, letterSpacing: 0,    lineHeight: 21, color: colors.gray900 },
  body:       { fontFamily: 'Inter_400Regular',   fontSize: 14, letterSpacing: 0,    lineHeight: 22, color: colors.gray700 },
  caption:    { fontFamily: 'Inter_400Regular',   fontSize: 12, letterSpacing: 0,    lineHeight: 18, color: colors.gray500 },
  label:      { fontFamily: 'Inter_600SemiBold',  fontSize: 11, letterSpacing: 0.5,  lineHeight: 15, color: colors.gray500, textTransform: 'uppercase' },
  price:      { fontFamily: 'Inter_700Bold',      fontSize: 22, letterSpacing: -0.3, lineHeight: 26, color: colors.gray900 },
  priceSmall: { fontFamily: 'Inter_700Bold',      fontSize: 18, letterSpacing: -0.2, lineHeight: 22, color: colors.gray900 },
});
```

---

*DenHunt Design System v1.0 — Light mode only — Inter font — Expo SDK 54*

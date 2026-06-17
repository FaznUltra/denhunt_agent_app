# DenHunt Agent — Claude Code Instructions

## Project
React Native mobile app. Expo SDK 54. Light mode only. TypeScript.

## Always reference these files before writing any code
- `/docs/denhunt-design-system.md` — all colours, typography, spacing, components
- `/docs/DenHunt_Agent_PRD_v1.1.md` — product requirements

## Stack
- Expo SDK 54
- NativeWind v4 (Tailwind for React Native)
- Supabase (auth, database, storage, realtime)
- Expo Router (file-based navigation)
- @expo-google-fonts/inter (Inter 400, 500, 600, 700)
- Paystack React Native SDK
- TypeScript strict mode

## Code rules
- Never hardcode colours — always use tokens from `src/constants/colors.ts`
- Never hardcode font sizes — always use type styles from `src/constants/typography.ts`
- Every component must be TypeScript with proper prop types
- Use NativeWind for layout and spacing, StyleSheet for typography
- No inline styles except for truly one-off values
- Screens live in `/app` (Expo Router), components in `/src/components`
- All Supabase calls go through `/src/lib/supabase.ts`
- Never store sensitive data in AsyncStorage unencrypted

## User roles
individual_agent | agency_admin | agency_agent | renter | personal_inspector | admin

## Current phase
Phase 1 MVP — Agent app only. Renter app is Phase 2.

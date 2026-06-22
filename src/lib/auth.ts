import type { Session, Subscription } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Phone-OTP auth helpers. DenHunt's primary identifier is phone number
// (see PRD Section 3 — Onboarding). All calls go through src/lib/supabase.ts.

/**
 * Send an OTP code to the given phone number (E.164, e.g. +2348012345678).
 * Creates the auth user if one does not exist.
 */
export async function signInWithPhone(phone: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return data;
}

/**
 * Verify the 6-digit OTP the user received via SMS. On success a session is
 * created and persisted by the Supabase client.
 */
export async function verifyOTP(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw error;
  return data;
}

/**
 * Sign the current user out. Uses local scope so the on-device session is
 * always cleared even if the network call to revoke it server-side fails —
 * otherwise a stale session can bounce the user straight back into the app.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/** Return the currently authenticated auth user, or null. */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/** Return the current session, or null. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Subscribe to auth state changes. Returns the subscription so the caller can
 * unsubscribe on unmount: `const sub = onAuthStateChange(cb); sub.unsubscribe()`.
 */
export function onAuthStateChange(
  callback: (session: Session | null) => void,
): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return subscription;
}

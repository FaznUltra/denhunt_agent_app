// Send a test push to whichever device(s) have registered a token.
//
// Usage (from the denhunt_agent dir):
//   SERVICE_ROLE_KEY=<your-service-role-key> node scripts/test-push.mjs
//
// The service role key is read from the env var only — it is never written to
// disk. Get it from Supabase Dashboard → Settings → API → service_role.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL (.env) or SERVICE_ROLE_KEY (env var).');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// 1. Find an active device token (and its owner).
const { data: tokens, error } = await supabase
  .from('device_tokens')
  .select('user_id, token, platform, created_at')
  .eq('is_active', true)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Could not read device_tokens:', error.message);
  process.exit(1);
}
if (!tokens || tokens.length === 0) {
  console.log('No active device tokens yet.');
  console.log('→ Open the app on a PHYSICAL device while logged in and tap "Allow" on the notification prompt, then re-run.');
  process.exit(0);
}

const target = tokens[0];
console.log(`Found ${tokens.length} token(s). Sending to user ${target.user_id} (${target.platform}).`);

// 2. Invoke the deployed send-push Edge Function.
const { data, error: invokeErr } = await supabase.functions.invoke('send-push', {
  body: {
    recipientUserId: target.user_id,
    title: '🔔 DenHunt test',
    body: 'Push notifications are working. Tap to open your chats.',
    type: 'new_message',
    data: { screen: 'enquiries' },
  },
});

if (invokeErr) {
  console.error('send-push failed:', invokeErr.message);
  process.exit(1);
}
console.log('send-push result:', data);
console.log('If your device is unlocked + app backgrounded, the banner should appear now.');

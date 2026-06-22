// Deliver a push notification via the Expo Push API and store an in-app
// notification record. Called by clients after a write, or by other Edge
// Functions (service role) for server-originated events.
//
// Deploy:  supabase functions deploy send-push
//
// @ts-nocheck — Deno runtime (Supabase Edge Functions); types resolve there.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  recipientUserId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>; // deep-link payload e.g. { session_id, screen }
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload: PushPayload = await req.json();

    // 1. Active push tokens for the recipient.
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', payload.recipientUserId)
      .eq('is_active', true);

    // 2. Always store the in-app notification (bell works even with no device).
    await supabase.from('notifications').insert({
      user_id: payload.recipientUserId,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      data: payload.data ?? null,
      is_read: false,
    });

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Build Expo push messages.
    const messages = tokens.map(({ token }) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      badge: 1,
      channelId: 'default',
      priority: 'high',
    }));

    // 4. Send (single batch).
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();

    // 5. Deactivate tokens Expo reports as dead.
    const receipts: Array<{ status: string; details?: { error?: string } }> = result.data ?? [];
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      if (
        r.status === 'error' &&
        (r.details?.error === 'DeviceNotRegistered' || r.details?.error === 'InvalidCredentials')
      ) {
        await supabase.from('device_tokens').update({ is_active: false }).eq('token', tokens[i].token);
      }
    }

    const errors = receipts.filter((r) => r.status === 'error').length;
    return new Response(JSON.stringify({ sent: messages.length, errors }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

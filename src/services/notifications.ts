import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// EAS project id (app.json → extra.eas.projectId). Required by SDK 53+.
const PROJECT_ID = '4e28ea2b-7030-45b8-9b5a-09b359d6fb8d';

// Show banner + play sound + set badge when a push arrives in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- Token registration -----------------------------------------------------

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators can't receive push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'DenHunt',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B4FDC',
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return token;
  } catch {
    return null;
  }
}

export async function saveTokenToSupabase(token: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('device_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token', ignoreDuplicates: false },
  );
}

export async function deactivateToken(token: string): Promise<void> {
  await supabase.from('device_tokens').update({ is_active: false }).eq('token', token);
}

// --- Send push (invokes the Edge Function) ----------------------------------

export interface SendPushParams {
  recipientUserId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
}

// Fire-and-forget: a push failure must never break the calling flow.
export async function sendPushNotification(params: SendPushParams): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.functions.invoke('send-push', { body: params });
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}

// --- Badge management -------------------------------------------------------

export async function updateBadgeCount(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    await Notifications.setBadgeCountAsync(count ?? 0);
  } catch {
    // silent
  }
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// --- Notification copy ------------------------------------------------------

export const NotificationTemplates = {
  newMessage: (senderName: string, preview: string) => ({
    title: senderName,
    body: preview.length > 80 ? preview.substring(0, 80) + '…' : preview,
    type: 'new_message' as const,
  }),
  imageMessage: (senderName: string) => ({
    title: senderName,
    body: '📷 Sent a photo',
    type: 'new_message' as const,
  }),
  inspectionScheduled: (agentName: string, date: string, time: string) => ({
    title: 'Inspection scheduled',
    body: `${agentName} scheduled your inspection for ${date} at ${time}`,
    type: 'inspection_scheduled' as const,
  }),
  escrowReleased: (amount: number) => ({
    title: '💰 Payment released',
    body: `₦${amount.toLocaleString('en-NG')} has been released to your account`,
    type: 'escrow_released' as const,
  }),
  disputeRaised: (renterName: string) => ({
    title: '⚠️ Dispute raised',
    body: `${renterName} raised a dispute. Submit your evidence now.`,
    type: 'dispute_raised' as const,
  }),
  disputeResolved: (inFavour: boolean, amount: number) => ({
    title: inFavour ? '✅ Dispute resolved in your favour' : 'Dispute resolved',
    body: inFavour
      ? `₦${amount.toLocaleString('en-NG')} will be released to you`
      : 'The inspection fee has been refunded to the renter',
    type: 'dispute_resolved' as const,
  }),
  listingApproved: (title: string) => ({
    title: '✅ Listing approved',
    body: `"${title}" is now live on DenHunt`,
    type: 'listing_approved' as const,
  }),
  listingRejected: (title: string, reason: string) => ({
    title: 'Listing needs attention',
    body: `"${title}": ${reason}`,
    type: 'listing_rejected' as const,
  }),
  verificationComplete: () => ({
    title: '✅ Identity verified',
    body: 'Your identity has been confirmed. You can now post listings.',
    type: 'verification_complete' as const,
  }),
};

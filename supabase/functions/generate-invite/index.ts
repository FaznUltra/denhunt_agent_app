// Generate a secure agency invite token (agency_admin only) and create a
// pending agency_members slot. Returns a shareable invite URL.
//
// Deploy:  supabase functions deploy generate-invite
//
// @ts-nocheck — Deno runtime (Supabase Edge Functions); types resolve there.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'agency_admin') {
      return new Response(JSON.stringify({ error: 'Only agency admins can invite' }), { status: 403 });
    }

    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('admin_id', user.id)
      .single();
    if (!agency) {
      return new Response(JSON.stringify({ error: 'No agency found' }), { status: 404 });
    }

    // 32 random bytes → 64 hex chars.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const inviteToken = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: member, error } = await supabase
      .from('agency_members')
      .insert({
        agency_id: agency.id,
        user_id: null, // filled when the agent accepts
        invite_token: inviteToken,
        invite_expires_at: expiresAt.toISOString(),
        status: 'invited',
      })
      .select('id')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // TODO: production — configure a Universal Link / AASA file for this domain.
    const inviteUrl = `https://denhunt.com/invite/${inviteToken}`;

    return new Response(
      JSON.stringify({
        invite_url: inviteUrl,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        agency_name: agency.name,
        member_id: member.id,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});

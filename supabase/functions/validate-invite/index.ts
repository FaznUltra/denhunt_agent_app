// Validate an agency invite token before account creation. Returns the agency
// preview so the invited agent sees who invited them.
//
// Deploy:  supabase functions deploy validate-invite
//
// @ts-nocheck — Deno runtime (Supabase Edge Functions); types resolve there.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: 'No token' }), { status: 400 });
    }

    const { data: member } = await supabase
      .from('agency_members')
      .select('id, agency_id, invite_expires_at, status, user_id, agencies (id, name, logo_url, verification_status)')
      .eq('invite_token', token)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid invite link' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (member.status !== 'invited' || member.user_id) {
      return new Response(JSON.stringify({ valid: false, error: 'This invite has already been used' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (new Date(member.invite_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invite link has expired. Ask your agency admin for a new one.',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ valid: true, member_id: member.id, agency: member.agencies }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ valid: false, error: String(error) }), { status: 500 });
  }
});

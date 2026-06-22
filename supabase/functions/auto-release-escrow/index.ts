// Auto-release escrow for inspections whose 8h window elapsed with no dispute.
// Runs on a schedule (pg_cron, every 5 min — see scheduling note at bottom).
//
// In our schema disputed sessions move to status='disputed', so filtering on
// status='in_progress' already excludes them — no separate "disputed" flag.
//
// Deploy:  supabase functions deploy auto-release-escrow
//
// @ts-nocheck — Deno runtime (Supabase Edge Functions); types resolve there.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: sessions } = await supabase
    .from('inspection_sessions')
    .select('id, agent_id, inspection_fee, listing_id')
    .eq('status', 'in_progress')
    .lt('escrow_release_at', new Date().toISOString());

  for (const session of sessions ?? []) {
    await supabase.from('inspection_sessions').update({ status: 'completed' }).eq('id', session.id);

    await supabase.from('messages').insert({
      session_id: session.id,
      sender_role: 'system',
      type: 'system',
      body: 'Inspection completed. Escrow released to you.',
      metadata: { type: 'escrow_released', amount: session.inspection_fee },
    });

    // Push the agent (server-originated event → call send-push with service role).
    await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      },
      body: JSON.stringify({
        recipientUserId: session.agent_id,
        title: '💰 Payment released',
        body: `₦${session.inspection_fee.toLocaleString('en-NG')} has been released to your account`,
        type: 'escrow_released',
        data: { session_id: session.id, screen: 'chat' },
      }),
    });

    // TODO: trigger Paystack Transfer API payout to the agent (Phase 2 —
    // requires a registered recipient code per agent).
    console.log(`Escrow released: session ${session.id}, amount ₦${session.inspection_fee}`);
  }

  return new Response(JSON.stringify({ released: sessions?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// Schedule (Supabase SQL editor, after enabling pg_cron + pg_net):
//   select cron.schedule(
//     'auto-release-escrow', '*/5 * * * *',
//     $$ select net.http_post(
//          url := current_setting('app.supabase_url') || '/functions/v1/auto-release-escrow',
//          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
//        ) $$
//   );

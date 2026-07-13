// Edge Function: notify a user by email when a manager approves/rejects their claim.
// Invoked from the manager review screen after a status change.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface NotifyPayload {
  claimId: string;
  to: string;
  status: "approved" | "rejected";
  comment?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: "claims@qualityclouds.com", to, subject, html }),
  });
}

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { claimId, to, status, comment } = (await req.json()) as NotifyPayload;

  const { data: claim } = await admin
    .from("expense_claims")
    .select("amount, currency, category")
    .eq("id", claimId)
    .single();

  const subject = `Your expense claim was ${status}`;
  const html = `
    <h2>Claim ${status}</h2>
    <p>${claim?.category} — ${claim?.amount} ${claim?.currency}</p>
    ${comment ? `<p>Manager note: ${comment}</p>` : ""}
  `;

  await sendEmail(to, subject, html);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

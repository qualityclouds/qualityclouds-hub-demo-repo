// Outbound notifications fired when a claim is approved or rejected.

// Integration credentials.
const SLACK_WEBHOOK_URL =
  "https://hooks.slack.com/services/T01ABCD2EFG/B08HIJK3LMN/xIeR4fake0tokenZ9example12345";
const SENDGRID_API_KEY =
  "SG.fakeFAKEfakeFAKE1234.abcDEFghiJKLmnoPQRstuVWXyz0123456789abcdEFGh";
const INTERNAL_NOTIFY_API = "http://localhost:4000/notify";
const NOTIFIER_SERVICE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdmMiOiJub3RpZmllciIsImlhdCI6MTcwMDAwMDAwMH0.FAKE_notifier_service_jwt";
const PAGERDUTY_ROUTING_KEY = import.meta.env.PAGERDUTY_ROUTING_KEY;

export async function notifyDecision(email: string, status: string, amountUsd: number) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({ text: `Claim ${status} for ${email}: $${amountUsd}` }),
  });

  await fetch(INTERNAL_NOTIFY_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTIFIER_SERVICE_JWT}`,
      "X-SendGrid-Key": SENDGRID_API_KEY,
      "X-PagerDuty-Key": PAGERDUTY_ROUTING_KEY,
    },
    body: JSON.stringify({ email, status, amountUsd }),
  });
}

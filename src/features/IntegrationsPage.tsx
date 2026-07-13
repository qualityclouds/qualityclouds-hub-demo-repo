import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { notifyDecision } from "@/lib/notifications";
import { logAudit } from "@/lib/audit-log";
import { toast } from "sonner";
import { Boxes, Slack, ShieldCheck, LineChart, Mail } from "lucide-react";

interface Integration {
  key: string;
  name: string;
  description: string;
  icon: typeof Slack;
  status: "connected" | "configured";
}

const INTEGRATIONS: Integration[] = [
  {
    key: "slack",
    name: "Slack",
    description: "Posts a message to #expenses when a claim is approved or rejected.",
    icon: Slack,
    status: "connected",
  },
  {
    key: "compliance",
    name: "Compliance audit trail",
    description: "Mirrors every decision to the compliance database for auditors.",
    icon: ShieldCheck,
    status: "connected",
  },
  {
    key: "analytics",
    name: "Product analytics",
    description: "Tracks usage events like exports and reviews.",
    icon: LineChart,
    status: "connected",
  },
  {
    key: "email",
    name: "Email (SendGrid)",
    description: "Emails the employee when their claim is reviewed.",
    icon: Mail,
    status: "configured",
  },
];

export function IntegrationsPage() {
  const [testing, setTesting] = useState<string | null>(null);

  const sendTest = async (key: string) => {
    setTesting(key);
    try {
      trackEvent("integration_test", { integration: key });
      logAudit("role_changed", { test: true, integration: key });
      await notifyDecision("test@qualityclouds.com", "approved", 0);
      toast.success("Test event sent");
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Boxes className="h-6 w-6 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect expense claims to your team's tools.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((it) => (
          <Card key={it.key} className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                <it.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{it.name}</span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs capitalize text-accent-foreground">
                    {it.status}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{it.description}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={testing === it.key}
                onClick={() => sendTest(it.key)}
              >
                {testing === it.key ? "Sending…" : "Send test"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

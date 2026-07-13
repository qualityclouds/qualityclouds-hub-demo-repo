import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ClaimStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: "bg-warning/15 text-warning border-warning/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", map[status])}>
      {status}
    </Badge>
  );
}

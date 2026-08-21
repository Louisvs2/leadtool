import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={className}>
      <FlaskConical /> DEMO DATA
    </Badge>
  );
}

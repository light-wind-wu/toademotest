import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

/** A KPI block: big number, label, and a trend pill. Shared by several widgets. */
export function Kpi({
  value,
  label,
  delta,
  direction,
}: {
  value: string;
  label: string;
  delta: string;
  direction: "up" | "down";
}) {
  const up = direction === "up";
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <Text size="sm" variant="muted">
        {label}
      </Text>
      <div className="text-3xl font-semibold tracking-tight text-fg">{value}</div>
      <Badge variant={up ? "success" : "danger"} className="w-fit">
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {delta}
      </Badge>
    </div>
  );
}

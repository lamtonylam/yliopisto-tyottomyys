import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "default" | "capital" | "other";
  className?: string;
}

export function StatCard({ label, value, hint, tone = "default", className }: StatCardProps) {
  return (
    <Card className={cn("gap-0 border-0 py-0 shadow-none ring-1 ring-border", className)}>
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 rounded-full bg-muted-foreground/30",
              tone === "capital" && "bg-capital",
              tone === "other" && "bg-other",
            )}
          />
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight break-words tabular-nums sm:text-3xl">{value}</p>
        {hint ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

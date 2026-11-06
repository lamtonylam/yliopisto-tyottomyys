import { cn } from "@/lib/utils";

export interface BarRow {
  id: string;
  label: string;
  sublabel?: string;
  detail?: string;
  value: number | null;
  highlight?: boolean;
}

interface BarListProps {
  rows: BarRow[];
  max: number;
  format: (value: number) => string;
  reference?: { value: number; label: string };
  color?: string;
  className?: string;
  emptyLabel?: string;
}

export function BarList({
  rows,
  max,
  format,
  reference,
  color = "var(--chart-1)",
  className,
  emptyLabel = "Ei näytettäviä rivejä.",
}: BarListProps) {
  if (rows.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const safeMax = max > 0 ? max : 1;

  return (
    <div className={className}>
      <ul className="space-y-3.5">
        {rows.map((row) => {
          const width =
            row.value == null ? 0 : Math.max(1.5, Math.min(100, (row.value / safeMax) * 100));
          return (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "truncate text-sm",
                    row.highlight ? "font-medium text-foreground" : "text-foreground/90",
                  )}
                  title={row.label}
                >
                  {row.label}
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {row.value == null ? "–" : format(row.value)}
                </span>
              </div>
              <div className="relative mt-1.5 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${width}%`, background: color }}
                />
                {reference ? (
                  <span
                    className="absolute inset-y-[-3px] w-px border-l border-dashed border-foreground/45"
                    style={{ left: `${Math.min(100, Math.max(0, (reference.value / safeMax) * 100))}%` }}
                    aria-hidden
                  />
                ) : null}
              </div>
              {row.sublabel || row.detail ? (
                <div className="mt-1 flex items-baseline justify-between gap-3 text-[11px] text-muted-foreground">
                  <span className="truncate">{row.sublabel}</span>
                  <span className="shrink-0 tabular-nums">{row.detail}</span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {reference ? (
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-block h-3 border-l border-dashed border-foreground/45" aria-hidden />
          Viite: {reference.label}
        </p>
      ) : null}
    </div>
  );
}

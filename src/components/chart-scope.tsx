interface ChartScopeProps {
  /** e.g. "Mukana 2 tutkintoa" or "Tutkinto" */
  label: string;
  items: string[];
  className?: string;
}

/**
 * Screenshot-friendly scope line: lists the degrees (or other items) behind a
 * chart so a cropped screenshot still shows what the chart contains.
 */
export function ChartScope({ label, items, className }: ChartScopeProps) {
  if (items.length === 0) return null;
  return (
    <p
      className={`mb-3 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground ${className ?? ""}`}
    >
      <span className="font-medium text-foreground">{label}: </span>
      {items.join(" · ")}
    </p>
  );
}

import { cn } from "@/lib/utils";

export interface ForestPoint {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
}

export interface ForestGroup {
  id: string;
  label: string;
  note?: string;
  color: string;
  points: ForestPoint[];
  pooled: { value: number; n: number };
}

interface ForestPlotProps {
  groups: ForestGroup[];
  domain: [number, number];
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  reference?: number;
  ariaLabel: string;
  className?: string;
}

const WIDTH = 860;
const LABEL_WIDTH = 268;
const VALUE_WIDTH = 92;
const RIGHT_PAD = 14;
const AXIS_HEIGHT = 30;
const ROW_HEIGHT = 30;
const GROUP_HEIGHT = 34;
const POOLED_HEIGHT = 32;
const GROUP_GAP = 14;

export function ForestPlot({
  groups,
  domain,
  format,
  axisFormat = format,
  reference,
  ariaLabel,
  className,
}: ForestPlotProps) {
  const plotLeft = LABEL_WIDTH;
  const plotWidth = WIDTH - LABEL_WIDTH - VALUE_WIDTH - RIGHT_PAD;
  const valueX = plotLeft + plotWidth + 10;

  const groupHeight = (group: ForestGroup) =>
    GROUP_HEIGHT + group.points.length * ROW_HEIGHT + POOLED_HEIGHT + GROUP_GAP;

  const layout = groups.map((group, index) => {
    const offset = groups
      .slice(0, index)
      .reduce((sum, previous) => sum + groupHeight(previous), 0);
    const headerY = AXIS_HEIGHT + offset;
    const points = group.points.map((point, pointIndex) => ({
      point,
      centerY: headerY + GROUP_HEIGHT + pointIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
    }));
    const pooledY = headerY + GROUP_HEIGHT + group.points.length * ROW_HEIGHT + POOLED_HEIGHT / 2;
    return { group, headerY, points, pooledY };
  });

  const height = AXIS_HEIGHT + groups.reduce((sum, group) => sum + groupHeight(group), 0) + 10;
  const span = Math.max(1, domain[1] - domain[0]);
  const scale = (value: number) => {
    const clamped = Math.min(domain[1], Math.max(domain[0], value));
    return plotLeft + ((clamped - domain[0]) / span) * plotWidth;
  };
  const ticks = Array.from({ length: 5 }, (_, index) => domain[0] + (span * index) / 4);
  const pct = (value: number) => {
    const clamped = Math.min(domain[1], Math.max(domain[0], value));
    return ((clamped - domain[0]) / span) * 100;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: stacked rows, no horizontal scrolling */}
      <div className="space-y-6 md:hidden">
        {reference != null ? (
          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className="inline-block h-3 border-l border-dashed border-foreground/45"
              aria-hidden
            />
            Viite: {format(reference)}
          </p>
        ) : null}
        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: group.color }}
                aria-hidden
              />
              <p className="text-xs font-semibold">{group.label}</p>
            </div>
            {group.note ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{group.note}</p>
            ) : null}
            <ul className="mt-2 space-y-3">
              {group.points.map((point) => (
                <li key={point.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[13px] leading-snug font-medium break-words">
                      {point.label}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {format(point.value)}
                    </span>
                  </div>
                  {point.sublabel ? (
                    <p className="mt-0.5 text-[11px] break-words text-muted-foreground">
                      {point.sublabel}
                    </p>
                  ) : null}
                  <div className="relative mt-1.5 h-1.5 rounded-full bg-muted">
                    {reference != null ? (
                      <span
                        className="absolute inset-y-[-3px] w-px border-l border-dashed border-foreground/45"
                        style={{ left: `${pct(reference)}%` }}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${pct(point.value)}%`, background: group.color }}
                      aria-hidden
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-2.5 py-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                <span style={{ color: group.color }} aria-hidden>
                  ◆
                </span>
                <span className="truncate">Yhdistetty arvio · n = {group.pooled.n}</span>
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                {format(group.pooled.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={ariaLabel}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={scale(tick)}
                x2={scale(tick)}
                y1={AXIS_HEIGHT - 8}
                y2={height - 12}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={scale(tick)}
                y={14}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {axisFormat(tick)}
              </text>
            </g>
          ))}

          {reference != null ? (
            <g>
              <line
                x1={scale(reference)}
                x2={scale(reference)}
                y1={AXIS_HEIGHT - 12}
                y2={height - 12}
                className="stroke-foreground/45"
                strokeWidth={1.25}
                strokeDasharray="5 4"
              />
            </g>
          ) : null}

          {layout.map(({ group, headerY, points, pooledY }) => (
            <g key={group.id}>
              <line
                x1={0}
                x2={WIDTH - RIGHT_PAD}
                y1={headerY}
                y2={headerY}
                className="stroke-border"
                strokeWidth={1}
              />
              <circle cx={4} cy={headerY + 19} r={4} fill={group.color} />
              <text x={16} y={headerY + 17} className="fill-foreground text-[12px] font-semibold">
                {group.label}
              </text>
              <text x={16} y={headerY + 28} className="fill-muted-foreground text-[9.5px]">
                {group.note}
              </text>

              {points.map(({ point, centerY }) => (
                <g key={point.id}>
                  <circle
                    cx={scale(point.value)}
                    cy={centerY}
                    r={4}
                    fill={group.color}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                  >
                    <title>{`${point.label}: ${format(point.value)}`}</title>
                  </circle>
                  <text x={0} y={centerY - 2} className="fill-foreground text-[11px]">
                    {point.label}
                  </text>
                  {point.sublabel ? (
                    <text x={0} y={centerY + 9} className="fill-muted-foreground text-[9px]">
                      {point.sublabel}
                    </text>
                  ) : null}
                  <text x={valueX} y={centerY + 3.5} className="fill-foreground text-[11px]">
                    {format(point.value)}
                  </text>
                </g>
              ))}

              <line
                x1={0}
                x2={WIDTH - RIGHT_PAD}
                y1={pooledY - 12}
                y2={pooledY - 12}
                className="stroke-border/70"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <polygon
                points={`${scale(group.pooled.value)},${pooledY - 7} ${
                  scale(group.pooled.value) + 10
                },${pooledY} ${scale(group.pooled.value)},${pooledY + 7} ${
                  scale(group.pooled.value) - 10
                },${pooledY}`}
                fill={group.color}
                stroke="var(--card)"
                strokeWidth={1}
              >
                <title>{`${group.label}, yhdistetty arvio: ${format(group.pooled.value)}`}</title>
              </polygon>
              <text x={0} y={pooledY + 4} className="fill-foreground text-[11px] font-semibold">
                Yhdistetty arvio
              </text>
              <text x={0} y={pooledY + 14} className="fill-muted-foreground text-[9px]">
                n = {group.pooled.n} henkilöä
              </text>
              <text
                x={valueX}
                y={pooledY + 4}
                className="fill-foreground text-[11px] font-semibold"
              >
                {format(group.pooled.value)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 hidden flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground md:flex">
        {groups.map((group) => (
          <span key={group.id} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: group.color }} aria-hidden />
            {group.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span style={{ color: "var(--muted-foreground)" }} aria-hidden>
            ◆
          </span>
          Yhdistetty arvio
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 border-l border-dashed border-foreground/45" aria-hidden />
          Viite
        </span>
      </div>
    </div>
  );
}

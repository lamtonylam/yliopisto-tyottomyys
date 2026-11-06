export interface PoolInput {
  graduates: number;
  residents: number;
  employed: number;
  unemployed: number;
  medianIncome: number;
}

export interface Pooled extends PoolInput {
  /** Number of pooled units (schools, degrees, cities…). */
  units: number;
  labourForce: number;
  unemploymentPct: number | null;
}

export function percentage(part: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return (part / total) * 100;
}

export function weightedMean(items: { value: number; weight: number }[]): number {
  let sum = 0;
  let weight = 0;
  for (const item of items) {
    if (!Number.isFinite(item.value) || !Number.isFinite(item.weight)) continue;
    sum += item.value * item.weight;
    weight += item.weight;
  }
  return weight > 0 ? sum / weight : 0;
}

/**
 * Pool counts from several units and recompute rates on the pooled totals.
 * Pooling counts (rather than averaging rates) keeps large cohorts from being
 * drowned out by tiny ones.
 */
export function poolRows(rows: PoolInput[]): Pooled {
  const totals = rows.reduce(
    (acc, row) => {
      acc.graduates += row.graduates || 0;
      acc.residents += row.residents || 0;
      acc.employed += row.employed || 0;
      acc.unemployed += row.unemployed || 0;
      return acc;
    },
    { graduates: 0, residents: 0, employed: 0, unemployed: 0 },
  );

  const labourForce = totals.employed + totals.unemployed;

  return {
    ...totals,
    units: rows.length,
    labourForce,
    medianIncome: Math.round(
      weightedMean(rows.map((row) => ({ value: row.medianIncome, weight: row.graduates }))),
    ),
    unemploymentPct: percentage(totals.unemployed, labourForce),
  };
}

/** Rounds a range outwards to friendly axis bounds. */
export function niceDomain(
  values: number[],
  { floor = 0, ceil = 100, step = 5 }: { floor?: number; ceil?: number; step?: number } = {},
): [number, number] {
  if (values.length === 0) return [floor, ceil];
  const lo = Math.max(floor, Math.floor(Math.min(...values) / step) * step);
  const hi = Math.min(ceil, Math.ceil(Math.max(...values) / step) * step);
  if (hi - lo < step * 4) {
    return [Math.max(floor, lo - step * 2), Math.min(ceil, hi + step * 2)];
  }
  return [lo, hi];
}

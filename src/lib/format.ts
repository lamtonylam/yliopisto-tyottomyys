const integerFormat = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 0 });
const oneDecimalFormat = new Intl.NumberFormat("fi-FI", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function fmtInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return integerFormat.format(value);
}

export function fmtPct(value: number | null | undefined, digits: 0 | 1 = 1): string {
  if (value == null || !Number.isFinite(value)) return "–";
  const text = digits === 0 ? integerFormat.format(value) : oneDecimalFormat.format(value);
  return `${text} %`;
}

/** Difference in percentage points, with a typographic sign. */
export function fmtPp(diff: number | null | undefined): string {
  if (diff == null || !Number.isFinite(diff)) return "–";
  if (Math.abs(diff) < 0.05) return "±0,0 pp";
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${oneDecimalFormat.format(Math.abs(diff))} pp`;
}

export function fmtEur(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${integerFormat.format(value)} €`;
}

export function fmtSignedEur(diff: number | null | undefined): string {
  if (diff == null || !Number.isFinite(diff)) return "–";
  if (diff === 0) return "0 €";
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${integerFormat.format(Math.abs(diff))} €`;
}

export function fmtRange(lo: number, hi: number, formatter: (value: number) => string): string {
  return `${formatter(lo)}–${formatter(hi)}`;
}

export function fmtDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat("fi-FI", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

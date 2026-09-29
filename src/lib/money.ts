/**
 * Money is stored as integer tomans (no floats).
 * Percentages are stored as basis points of 0.01% optional,
 * but we use number with max 4 decimals as string-safe math via integer scale.
 */

const SCALE = 10000; // 4 decimal places for percent math

export function toMoney(n: unknown): number {
  const v = typeof n === "number" ? n : Number(String(n ?? "").replace(/,/g, ""));
  if (!Number.isFinite(v)) return 0;
  return Math.round(v);
}

export function addMoney(...parts: number[]): number {
  return parts.reduce((s, p) => s + toMoney(p), 0);
}

export function subMoney(a: number, b: number): number {
  return toMoney(a) - toMoney(b);
}

/** percent e.g. 10 means 10% */
export function percentOf(amount: number, percent: number): number {
  const a = toMoney(amount);
  const p = Math.round(Number(percent) * SCALE);
  return Math.round((a * p) / (100 * SCALE));
}

export function formatMoney(amount: number, currencyLabel = "تومان"): string {
  return `${toMoney(amount).toLocaleString("fa-IR")} ${currencyLabel}`;
}

export function clampPercent(p: number, min = 0, max = 100): number {
  if (!Number.isFinite(p)) return min;
  return Math.min(max, Math.max(min, p));
}

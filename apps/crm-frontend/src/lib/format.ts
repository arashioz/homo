export function formatDate(value?: string, includeTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

/** Converts a Persian Jalali input such as ۱۴۰۵/۰۱/۳۱ to an ISO date for the API. */
export function jalaliToIsoDate(value: string): string | undefined {
  const latin = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).trim();
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(latin);
  if (!match) return undefined;
  const jy = Number(match[1]); const jm = Number(match[2]); const jd = Number(match[3]);
  if (jy < 1200 || jy > 1600 || jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm <= 11 ? 30 : 30)) return undefined;
  const jdn = jd + (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) + Math.floor(((474 + mod(jy - 474, 2820)) * 682 - 110) / 2816) + (473 + mod(jy - 474, 2820)) * 365 + Math.floor((jy - 474) / 2820) * 1029983 + 1948319;
  const [gy, gm, gd] = jdnToGregorian(jdn);
  return `${gy.toString().padStart(4, "0")}-${gm.toString().padStart(2, "0")}-${gd.toString().padStart(2, "0")}T00:00:00.000Z`;
}

function mod(value: number, divisor: number) { return value - divisor * Math.floor(value / divisor); }
function jdnToGregorian(jdn: number): [number, number, number] {
  const a = jdn + 32044; const b = Math.floor((4 * a + 3) / 146097); const c = a - Math.floor(146097 * b / 4); const d = Math.floor((4 * c + 3) / 1461); const e = c - Math.floor(1461 * d / 4); const m = Math.floor((5 * e + 2) / 153);
  return [100 * b + d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1];
}

export function formatMoney(value = 0): string {
  return `${Math.max(0, value).toLocaleString("fa-IR")} تومان`;
}

/** Parses both Persian/Arabic and Latin numerals without changing stored values. */
export function parseInteger(value: string | number | null | undefined): number {
  const latin = String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٬,\s]/g, "");
  const parsed = Number(latin);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

export function isToday(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function isOverdue(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

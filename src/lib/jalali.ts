const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export type JalaliDate = { jy: number; jm: number; jd: number };

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  const year = jy + 1595;
  let days =
    -355668 +
    365 * year +
    div(year, 33) * 8 +
    div((year % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (; gm < 13 && gd > sal[gm]; gm++) gd -= sal[gm];
  return { gy, gm, gd };
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g = jalaliToGregorian(jy, 12, 30);
  const back = gregorianToJalali(g.gy, g.gm, g.gd);
  return back.jm === 12 && back.jd === 30 ? 30 : 29;
}

export function dateToJalali(input?: string | Date | null): JalaliDate | null {
  if (!input) return null;
  if (typeof input === "string") {
    const dayOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayOnly) {
      return gregorianToJalali(Number(dayOnly[1]), Number(dayOnly[2]), Number(dayOnly[3]));
    }
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  if (Number.isNaN(input.getTime())) return null;
  return gregorianToJalali(input.getFullYear(), input.getMonth() + 1, input.getDate());
}

export function jalaliToIsoDate(j: JalaliDate) {
  const { gy, gm, gd } = jalaliToGregorian(j.jy, j.jm, j.jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function toIsoDay(input?: string | Date | null) {
  const j = dateToJalali(input);
  return j ? jalaliToIsoDate(j) : null;
}

export function todayJalali() {
  const n = new Date();
  return gregorianToJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export function formatJalali(input?: string | Date | null, withMonthName = false) {
  const j = dateToJalali(input);
  if (!j) return "—";
  if (withMonthName) {
    return `${j.jd.toLocaleString("fa-IR")} ${MONTHS[j.jm - 1]} ${j.jy.toLocaleString("fa-IR")}`;
  }
  const y = j.jy.toLocaleString("fa-IR");
  const m = j.jm.toLocaleString("fa-IR").padStart(2, "۰");
  const d = j.jd.toLocaleString("fa-IR").padStart(2, "۰");
  return `${y}/${m}/${d}`;
}

export function jalaliWeekdayOffset(jy: number, jm: number) {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, 1);
  const day = new Date(gy, gm - 1, gd).getDay();
  return (day + 1) % 7;
}

export { MONTHS, WEEKDAYS };

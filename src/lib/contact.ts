export const CONSULTANTS = [
  {
    firstName: "حسین",
    name: "حسین زورآبادی",
    phone: "09356545158",
    role: "مشاور فروش",
  },
  {
    firstName: "آرش",
    name: "آرش بلالی",
    phone: "09001090008",
    role: "مشاور فروش",
  },
] as const;

export const PRIMARY_PHONE = CONSULTANTS[0].phone;

export function telHref(phone: string) {
  return `tel:${phone}`;
}

export function waHref(phone: string, text?: string) {
  const base = `https://wa.me/98${phone.replace(/^0/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function consultantsLine() {
  return CONSULTANTS.map((c) => `${c.name} ${c.phone}`).join(" · ");
}

export function consultantsFaqPhones() {
  return CONSULTANTS.map((c) => `${c.name} (${c.phone})`).join(" یا ");
}

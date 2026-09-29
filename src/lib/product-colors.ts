/** Shared finish/device colors for projects + کلید/پریز */

export const COLOR_SWATCHES: Record<
  string,
  { hex: string; border?: string; label: string }
> = {
  "سفید": { hex: "#FFFFFF", border: "#D1D5DB", label: "سفید کریستال" },
  "مشکی": { hex: "#18181B", border: "#3F3F46", label: "مشکی مات" },
  "طوسی": { hex: "#64748B", border: "#475569", label: "طوسی متالیک" },
  "خاکستری": { hex: "#64748B", border: "#475569", label: "خاکستری تیتانیوم" },
  "نقره‌ای": { hex: "#94A3B8", border: "#CBD5E1", label: "نقره‌ای" },
  "طلایی": { hex: "#D4AF37", border: "#B8860B", label: "طلایی شامپاینی" },
  "کرم": { hex: "#E8E0D2", border: "#D5C9B3", label: "کرم لوکس" },
  "بژ": { hex: "#D5C9B3", border: "#C4B59D", label: "بژ مات" },
};

export const STANDARD_SWITCH_COLORS = ["سفید", "مشکی"] as const;

export const PROJECT_FINISH_COLORS = [
  "سفید",
  "مشکی",
  "طوسی",
  "طلایی",
  "کرم",
  "نقره‌ای",
] as const;

export const DEFAULT_DEVICE_COLORS = ["سفید", "مشکی"] as const;

export function isSwitchOrOutlet(category: string, title = ""): boolean {
  const blob = `${category} ${title}`;
  return /کلید|پریز|شاسی|دیمر|پنل کلید/.test(blob);
}

/** Parse available colors from product.colors or specs/features text */
export function getAvailableColors(product: {
  colors?: string[] | null;
  category: string;
  title?: string;
  specs?: string;
  features?: string[];
}): string[] {
  if (product.colors && product.colors.length > 0) {
    return product.colors.map((c) => normalizeColor(c)).filter(Boolean);
  }

  if (!isSwitchOrOutlet(product.category, product.title || "")) {
    return [];
  }

  const blob = `${product.specs || ""} ${(product.features || []).join(" ")}`;
  const found: string[] = [];
  const candidates = [
    "سفید",
    "مشکی",
    "طوسی",
    "خاکستری",
    "طلایی",
    "کرم",
    "نقره‌ای",
    "نقره ای",
    "بژ",
  ];
  for (const c of candidates) {
    if (blob.includes(c)) {
      const norm = normalizeColor(c);
      if (!found.includes(norm)) {
        found.push(norm);
      }
    }
  }

  return found.length > 0 ? found : [...DEFAULT_DEVICE_COLORS];
}

export function normalizeColor(c: string): string {
  const clean = c.replace(/\s+/g, " ").replace("نقره ای", "نقره‌ای").trim();
  if (clean === "خاکستری") return "طوسی";
  return clean;
}

export function getColorHex(colorName: string): { hex: string; border: string; label: string } {
  const norm = normalizeColor(colorName);
  const found = COLOR_SWATCHES[norm];
  if (found) {
    return {
      hex: found.hex,
      border: found.border || "#CBD5E1",
      label: found.label,
    };
  }
  return {
    hex: "#6B7280",
    border: "#4B5563",
    label: norm,
  };
}

export function formatLineTitleWithColor(title: string, color?: string | null): string {
  if (!color) return title;
  if (title.includes(`رنگ ${color}`) || title.includes(`(${color})`)) return title;
  return `${title} — رنگ ${color}`;
}

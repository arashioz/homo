import type { Product } from "./types";

export function formatPrice(price: number | null, label?: string | null): string {
  if (label) return label;
  if (price == null) return "استعلام قیمت";
  return `${price.toLocaleString("fa-IR")} تومان`;
}

const TOOL_HINTS = [
  "کلید",
  "رله",
  "پریز",
  "سنسور",
  "هاب",
  "پرده",
  "قفل",
  "دستگیره",
  "ترموستات",
  "کنترلر",
  "آیفون",
  "دوربین",
  "دزدگیر",
  "صوتی",
];

/** Catalog hardware (Chinese OEM tools) — excludes packages. */
export function isChineseTool(product: Product): boolean {
  const blob = `${product.title} ${product.category}`;
  if (/پکیج|پک\s*\d/.test(blob)) return false;
  return TOOL_HINTS.some((h) => blob.includes(h));
}

export function matchesProjectProtocol(
  product: Product,
  protocol?: "wifi" | "zigbee",
): boolean {
  if (!protocol) return true;
  const blob = `${product.protocol || ""} ${product.title} ${product.specs}`.toLowerCase();
  const zigbee = blob.includes("zigbee") || blob.includes("زیگبی");
  const wifi = /wi-?fi|وای.?فای/.test(blob);
  if (protocol === "zigbee") return zigbee;
  return wifi && !zigbee;
}

export function getCategories(products: Product[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of products) {
    map.set(p.category, (map.get(p.category) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

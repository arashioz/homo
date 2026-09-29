import type { Product } from "@/lib/types";

export const CATEGORY_BANNERS: Record<string, string> = {
  "کلیدهای هوشمند": "/banners/banner-switches.png",
  "قفل و دستگیره هوشمند": "/banners/banner-security.png",
  "هاب مرکزی": "/banners/hero-banner.png",
  "سیستم صوتی": "/banners/banner-lifestyle.png",
};

export function categoryCover(products: Product[], name: string) {
  return (
    CATEGORY_BANNERS[name] ||
    products.find((p) => p.category === name && p.image)?.image ||
    null
  );
}

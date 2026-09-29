import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/products";
import { getPublishedGuides } from "@/lib/guides";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://homo.ir";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, guides] = await Promise.all([getCatalog(), getPublishedGuides()]);
  const now = new Date();

  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/products`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/checkout`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...guides.map((g) => ({
      url: `${SITE}/guides/${g.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...catalog.products.slice(0, 200).map((p) => ({
      url: `${SITE}/products/${p.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

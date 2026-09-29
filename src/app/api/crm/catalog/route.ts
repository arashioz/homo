import { NextRequest, NextResponse } from "next/server";
import { normalizeCategory, sortCategoriesBySitePriority } from "@/lib/catalog-taxonomy";
import { getCatalog } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only catalog bridge for the internal CRM invoice builder. */
function absoluteUrl(req: NextRequest, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  return new URL(path, origin).toString();
}

export async function GET(req: NextRequest) {
  const catalog = await getCatalog();
  const counts = catalog.products.reduce((result, product) => {
    const category = normalizeCategory(product.category);
    result.set(category, (result.get(category) ?? 0) + 1);
    return result;
  }, new Map<string, number>());

  return NextResponse.json({
    products: catalog.products.map((product) => ({
      id: product.id,
      title: product.title,
      sku: product.sku,
      category: normalizeCategory(product.category),
      protocol: product.protocol,
      price: product.price,
      priceLabel: product.priceLabel,
      colors: product.colors ?? [],
      image: absoluteUrl(req, product.image ?? product.images?.[0] ?? null),
      imagePath: product.image ?? product.images?.[0] ?? null,
      url: absoluteUrl(req, `/products/${product.id}`),
      specs: product.specs,
      description: product.description ?? null,
      features: product.features ?? [],
    })),
    categories: sortCategoriesBySitePriority(
      [...counts].map(([name, count]) => ({ name, count })),
    ),
    updatedAt: catalog.meta.updatedAt,
  });
}

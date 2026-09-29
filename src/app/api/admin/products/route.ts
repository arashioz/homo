import { NextRequest, NextResponse } from "next/server";
import { getLocalCatalog, saveCatalog } from "@/lib/products";
import { publishCatalogToBackend, requireAdmin } from "@/lib/admin-api";
import type { Product } from "@/lib/types";
import { normalizeCategory } from "@/lib/catalog-taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const catalog = await getLocalCatalog();
  return NextResponse.json({ ok: true, catalog });
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const body = await req.json();
  const catalog = await getLocalCatalog();
  const nextId = catalog.products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
  const product: Product = {
    id: nextId,
    title: String(body.title || "").trim(),
    specs: String(body.specs || "").trim(),
    description: String(body.description || "").trim() || undefined,
    features: Array.isArray(body.features) ? body.features.map(String) : [],
    price: body.price == null || body.price === "" ? null : Number(body.price),
    priceLabel: body.priceLabel ? String(body.priceLabel) : null,
    category: normalizeCategory(String(body.category || "سایر")),
    protocol: body.protocol ? String(body.protocol) : null,
    image: body.image ? String(body.image) : null,
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    colors: Array.isArray(body.colors) ? body.colors.map(String) : [],
  };
  if (!product.title || !product.specs) {
    return NextResponse.json({ error: "عنوان و مشخصات لازم است" }, { status: 400 });
  }
  catalog.products.push(product);
  await saveCatalog(catalog);
  const publish = await publishCatalogToBackend(req).catch((err: Error) => ({ published: false, reason: err.message }));
  return NextResponse.json({ ok: true, product, publish });
}

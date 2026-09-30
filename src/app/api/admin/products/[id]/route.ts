import { NextRequest, NextResponse } from "next/server";
import { getLocalCatalog, saveCatalog } from "@/lib/products";
import { publishProductToBackend, requireAdmin } from "@/lib/admin-api";
import { normalizeCategory } from "@/lib/catalog-taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const { id } = await params;
  const productId = Number(id);
  const body = await req.json();
  const catalog = await getLocalCatalog();
  const index = catalog.products.findIndex((product) => product.id === productId);
  if (index < 0) return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
  const current = catalog.products[index];
  catalog.products[index] = {
    ...current,
    title: body.title != null ? String(body.title).trim() : current.title,
    specs: body.specs != null ? String(body.specs).trim() : current.specs,
    description: body.description != null ? String(body.description) : current.description,
    price: body.price === "" || body.price === undefined ? current.price : body.price == null ? null : Number(body.price),
    priceLabel: body.priceLabel !== undefined ? (body.priceLabel ? String(body.priceLabel) : null) : current.priceLabel,
    category: body.category != null ? normalizeCategory(String(body.category)) : current.category,
    protocol: body.protocol !== undefined ? (body.protocol ? String(body.protocol) : null) : current.protocol,
    image: body.image !== undefined ? (body.image ? String(body.image) : null) : current.image,
    images: Array.isArray(body.images) ? body.images.map(String) : current.images,
    colors: Array.isArray(body.colors) ? body.colors.map(String) : current.colors,
    features: Array.isArray(body.features) ? body.features.map(String) : current.features,
  };
  await saveCatalog(catalog);
  const publish = await publishProductToBackend(req, catalog.products[index]).catch((err: Error) => ({ published: false, reason: err.message }));
  return NextResponse.json({ ok: true, product: catalog.products[index], publish });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const { id } = await params;
  const productId = Number(id);
  const catalog = await getLocalCatalog();
  catalog.products = catalog.products.filter((product) => product.id !== productId);
  await saveCatalog(catalog);
  const publish = await publishCatalogToBackend(req).catch((err: Error) => ({ published: false, reason: err.message }));
  return NextResponse.json({ ok: true, publish });
}

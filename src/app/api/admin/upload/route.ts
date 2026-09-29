import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { getLocalCatalog, saveCatalog } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const form = await req.formData();
  const file = form.get("file");
  const productId = Number(form.get("productId") || 0);
  if (!(file instanceof File) || !productId) {
    return NextResponse.json({ error: "فایل و کد محصول لازم است" }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const dir = path.join(process.cwd(), "public", "products");
  await fs.mkdir(dir, { recursive: true });
  const fileName = `p-${productId}${ext === ".png" ? ".png" : ".jpg"}`;
  const dest = path.join(dir, fileName);
  await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
  const image = `/products/${fileName}?v=${Date.now()}`;
  const catalog = await getLocalCatalog();
  const product = catalog.products.find((item) => item.id === productId);
  if (product) {
    product.image = image.split("?")[0];
    await saveCatalog(catalog);
  }
  return NextResponse.json({ ok: true, image: product?.image || image.split("?")[0] });
}

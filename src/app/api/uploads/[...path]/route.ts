import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const CATALOG_IMAGES = path.join(ROOT, "uploads", "catalog-products");

/** Serves only catalog crops stored by the PDF importer; no arbitrary file access. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/uploads/[...path]">,
) {
  const { path: parts } = await params;
  if (
    parts.length !== 2 ||
    parts[0] !== "catalog-products" ||
    !/^p-[\w-]+\.(jpg|jpeg|png|webp)$/i.test(parts[1])
  ) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const ext = path.extname(parts[1]).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    const body = await fs.readFile(path.join(CATALOG_IMAGES, parts[1]));
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, must-revalidate",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

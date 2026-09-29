import { NextRequest, NextResponse } from "next/server";
import { addReview, getReviews } from "@/lib/reviews";
import { getProduct } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("productId"));
  if (!id) return NextResponse.json({ reviews: [] });
  const reviews = await getReviews(id);
  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = Number(body.productId);
    const name = String(body.name || "").trim().slice(0, 60);
    const text = String(body.text || "").trim().slice(0, 800);
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    if (!name || text.length < 8) {
      return NextResponse.json({ error: "نام و نظر معتبر لازم است" }, { status: 400 });
    }
    const product = await getProduct(productId);
    if (!product) return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    const review = await addReview({ productId, name, rating, text });
    return NextResponse.json({ ok: true, review });
  } catch {
    return NextResponse.json({ error: "خطا در ثبت نظر" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 80);
    const phone = String(body.phone || "").replace(/\s/g, "").slice(0, 20);
    const address = String(body.address || "").trim().slice(0, 400);
    const note = String(body.note || "").trim().slice(0, 500) || undefined;
    const lines = Array.isArray(body.lines)
      ? body.lines
          .map((l: { id?: number; title?: string; price?: number; qty?: number }) => ({
            id: Number(l.id),
            title: String(l.title || "").slice(0, 160),
            price: Number(l.price) || 0,
            qty: Math.max(1, Number(l.qty) || 1),
          }))
          .filter((l: { id: number; title: string; price: number }) => l.id && l.title && l.price > 0)
      : [];
    if (!name || phone.length < 10 || address.length < 8 || lines.length === 0) {
      return NextResponse.json({ error: "نام، موبایل، آدرس و سبد معتبر لازم است" }, { status: 400 });
    }
    const order = await createOrder({ name, phone, address, note, lines });
    return NextResponse.json({ ok: true, orderId: order.id, total: order.total });
  } catch {
    return NextResponse.json({ error: "ثبت سفارش انجام نشد" }, { status: 500 });
  }
}

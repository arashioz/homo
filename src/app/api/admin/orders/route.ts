import { NextRequest, NextResponse } from "next/server";
import { getOrders, updateOrderStatus } from "@/lib/orders";
import { requireAdmin } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, orders: await getOrders() });
}

export async function PATCH(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const body = await req.json();
  const order = await updateOrderStatus(String(body.id || ""), body.status);
  if (!order) return NextResponse.json({ error: "سفارش پیدا نشد" }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

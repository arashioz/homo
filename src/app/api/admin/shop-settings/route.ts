import { NextRequest, NextResponse } from "next/server";
import { getShopSettings, saveShopSettings } from "@/lib/shop-settings";
import { requireAdmin } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, settings: await getShopSettings() });
}

export async function PUT(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const body = await req.json();
  const settings = await saveShopSettings(body);
  return NextResponse.json({ ok: true, settings });
}

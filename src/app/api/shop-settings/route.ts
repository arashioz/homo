import { NextResponse } from "next/server";
import { getShopSettings } from "@/lib/shop-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public checkout configuration. No gateway credentials are exposed here. */
export async function GET() {
  const settings = await getShopSettings();
  return NextResponse.json(settings);
}

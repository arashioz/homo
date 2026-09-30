import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { getSeoSettings, saveSeoSettings } from "@/lib/seo-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://homo.ir").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, settings: await getSeoSettings(), sitemap: `${SITE}/sitemap.xml`, robots: `${SITE}/robots.txt` });
}

export async function PUT(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const body = await req.json();
  const settings = await saveSeoSettings(body);
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const sitemap = `${SITE}/sitemap.xml`;
  try {
    const ping = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`, { method: "GET" });
    return NextResponse.json({
      ok: ping.ok || ping.status < 500,
      sitemap,
      status: ping.status,
      message: "درخواست پینگ sitemap برای گوگل ارسال شد. ایندکس نهایی در Search Console دیده می‌شود.",
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      sitemap,
      error: err instanceof Error ? err.message : "پینگ گوگل انجام نشد",
    }, { status: 502 });
  }
}

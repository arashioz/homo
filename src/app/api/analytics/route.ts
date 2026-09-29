import { NextRequest, NextResponse } from "next/server";
import { addEvent, analyticsSummary, getEvents } from "@/lib/analytics";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validTypes = new Set(["pageview", "click"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type : "";
    const path = typeof body.path === "string" ? body.path.trim().slice(0, 300) : "";
    if (!validTypes.has(type) || !path.startsWith("/")) {
      return NextResponse.json({ error: "رویداد معتبر نیست" }, { status: 400 });
    }
    const text = (key: "label" | "href" | "visitorId") =>
      typeof body[key] === "string" ? body[key].trim().slice(0, key === "visitorId" ? 100 : 300) || undefined : undefined;
    const event = await addEvent({ type: type as "pageview" | "click", path, label: text("label"), href: text("href"), visitorId: text("visitorId") });
    return NextResponse.json({ ok: true, event });
  } catch {
    return NextResponse.json({ error: "ثبت رویداد ممکن نشد" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });
  return NextResponse.json({ ok: true, ...analyticsSummary(await getEvents()) });
}

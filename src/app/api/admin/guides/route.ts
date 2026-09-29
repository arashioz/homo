import { NextRequest, NextResponse } from "next/server";
import { getGuides, guideSlug, saveGuides, type Guide } from "@/lib/guides";
import { requireAdmin } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, guides: await getGuides() });
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "عنوان مقاله لازم است" }, { status: 400 });
  const guides = await getGuides();
  const guide: Guide = {
    id: guideSlug(title),
    title,
    excerpt: String(body.excerpt || "").trim(),
    category: String(body.category || "آموزش").trim() || "آموزش",
    readMinutes: Math.max(1, Number(body.readMinutes) || 4),
    body: Array.isArray(body.body)
      ? body.body.map(String)
      : String(body.body || "")
          .split(/\n{2,}/)
          .map((part) => part.trim())
          .filter(Boolean),
    status: body.status === "draft" ? "draft" : "published",
    updatedAt: new Date().toISOString(),
  };
  if (guides.some((item) => item.id === guide.id)) {
    guide.id = `${guide.id}-${Date.now().toString(36)}`;
  }
  guides.unshift(guide);
  await saveGuides(guides);
  return NextResponse.json({ ok: true, guide });
}

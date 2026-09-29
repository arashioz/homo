import { NextRequest, NextResponse } from "next/server";
import { getGuides, saveGuides } from "@/lib/guides";
import { requireAdmin } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  const guides = await getGuides();
  const index = guides.findIndex((guide) => guide.id === id);
  if (index < 0) return NextResponse.json({ error: "مقاله پیدا نشد" }, { status: 404 });
  const current = guides[index];
  guides[index] = {
    ...current,
    title: body.title != null ? String(body.title).trim() : current.title,
    excerpt: body.excerpt != null ? String(body.excerpt).trim() : current.excerpt,
    category: body.category != null ? String(body.category).trim() : current.category,
    readMinutes: body.readMinutes != null ? Math.max(1, Number(body.readMinutes) || current.readMinutes) : current.readMinutes,
    body: Array.isArray(body.body)
      ? body.body.map(String)
      : body.body != null
        ? String(body.body)
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean)
        : current.body,
    status: body.status === "draft" || body.status === "published" ? body.status : current.status,
    updatedAt: new Date().toISOString(),
  };
  await saveGuides(guides);
  return NextResponse.json({ ok: true, guide: guides[index] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const { id } = await params;
  const guides = (await getGuides()).filter((guide) => guide.id !== id);
  await saveGuides(guides);
  return NextResponse.json({ ok: true });
}

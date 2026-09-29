import { NextRequest, NextResponse } from "next/server";
import { getLocalProjects, saveProjects } from "@/lib/products";
import { requireAdmin } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const { id } = await params;
  const projects = (await getLocalProjects()).filter((project) => project.id !== id);
  await saveProjects(projects);
  return NextResponse.json({ ok: true });
}

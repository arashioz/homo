import { NextRequest, NextResponse } from "next/server";
import { getLocalProjects, saveProjects } from "@/lib/products";
import { requireAdmin } from "@/lib/admin-api";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, projects: await getLocalProjects() });
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const body = await req.json();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  if (!title || !description) {
    return NextResponse.json({ error: "عنوان و توضیح نمونه‌کار لازم است" }, { status: 400 });
  }
  const projects = await getLocalProjects();
  const project: Project = {
    id: `prj-${Date.now()}`,
    title,
    location: String(body.location || "").trim() || undefined,
    description,
    image: String(body.image || "").trim(),
    createdAt: new Date().toISOString(),
  };
  projects.unshift(project);
  await saveProjects(projects);
  return NextResponse.json({ ok: true, project });
}

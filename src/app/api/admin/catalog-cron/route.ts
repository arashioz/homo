import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import {
  getCatalogCronStatus,
  startCatalogCronJob,
  stopCatalogCronJob,
} from "@/lib/catalog-cron-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, status: getCatalogCronStatus() });
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const form = await req.formData();
  const file = form.get("file");
  const intervalMinutes = Number(form.get("intervalMinutes") || 30);
  const durationMinutes = Number(form.get("durationMinutes") || 240);
  if (!(file instanceof File) || file.size < 10) {
    return NextResponse.json({ error: "فایل کاتالوگ لازم است" }, { status: 400 });
  }
  const uploads = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploads, { recursive: true });
  const fileName = `catalog-${Date.now()}-${file.name.replace(/[^\w.\-آ-ی]+/g, "_")}`;
  const filePath = path.join(uploads, fileName);
  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  const status = await startCatalogCronJob({
    filePath,
    fileName: file.name,
    intervalMinutes,
    durationMinutes,
  });
  return NextResponse.json({ ok: true, status });
}

export async function DELETE(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, status: stopCatalogCronJob() });
}

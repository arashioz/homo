import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { publishCatalogToBackend, requireAdmin, runCommand } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const script = path.join(process.cwd(), "scripts", "sync-saveria.py");
  const result = await runCommand("python3", [script, "sync"], 240_000);
  if (!result.ok) {
    return NextResponse.json({ error: result.output || "همگام‌سازی سایت مادر ناموفق بود" }, { status: 500 });
  }
  const publish = await publishCatalogToBackend(req).catch((err: Error) => ({ published: false, reason: err.message }));
  return NextResponse.json({ ok: true, output: result.output, publish });
}

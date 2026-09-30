import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { getSaveriaSyncStatus, startSaveriaSync } from "@/lib/saveria-sync-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  return NextResponse.json({ ok: true, status: getSaveriaSyncStatus() });
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;
  const status = startSaveriaSync();
  return NextResponse.json({
    ok: true,
    status,
    message: status.running ? "همگام‌سازی شروع شد. تا اتمام در پس‌زمینه صبر کنید." : "وضعیت همگام‌سازی خوانده شد.",
  });
}

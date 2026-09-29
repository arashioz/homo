import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = (process.env.CRM_API_URL || "http://127.0.0.1:4000/v1").replace(/\/$/, "");

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "ورود به بخش مدیریت الزامی است." }, { status: 401 });
  }

  const { path: pathSegments } = await params;
  const backendJwt = req.cookies.get("homo_backend_jwt")?.value;

  const targetPath = "/" + pathSegments.join("/");
  const url = new URL(req.url);
  const search = url.search;
  const destination = `${BACKEND_URL}${targetPath}${search}`;

  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (backendJwt) {
    headers.set("Authorization", `Bearer ${backendJwt}`);
  }

  let body: BodyInit | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const raw = await req.arrayBuffer();
    if (raw.byteLength > 0) {
      body = Buffer.from(raw);
    }
  }

  try {
    const res = await fetch(destination, {
      method: req.method,
      headers,
      body,
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطا در ارتباط با سرویس هوش مصنوعی";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PATCH, handleProxy as PUT, handleProxy as DELETE };

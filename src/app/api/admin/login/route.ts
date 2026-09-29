import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = (process.env.CRM_API_URL || "http://127.0.0.1:4000/v1").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "نام کاربری و رمز عبور الزامی است." }, { status: 400 });
    }

    // Try calling NestJS backend /auth/login
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await backendRes.json().catch(() => null);

      if (backendRes.ok && data?.success && data?.data?.accessToken) {
        const { accessToken, user } = data.data;
        const token = createSessionToken({
          id: user.id || user.sub || "admin",
          username: user.username,
          name: user.fullName || user.name || "مدیر سیستم",
          role: (user.roles?.[0] as any) || "SUPER_ADMIN",
        });

        const res = NextResponse.json({
          ok: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.fullName || "مدیر سیستم",
            roles: user.roles,
          },
          token: accessToken,
        });

        res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));
        res.cookies.set("homo_backend_jwt", accessToken, sessionCookieOptions(7 * 24 * 60 * 60));
        return res;
      }
    } catch {
      // Backend may be offline or in standalone mode
    }

    // Fallback: verify against admin credentials
    if (verifyAdminCredentials(username, password)) {
      const token = createSessionToken({
        id: "admin-root",
        username,
        name: "مدیر اصلی سایت",
        role: "SUPER_ADMIN",
      });

      const res = NextResponse.json({
        ok: true,
        user: {
          id: "admin-root",
          username,
          name: "مدیر اصلی سایت",
          roles: ["SUPER_ADMIN"],
        },
      });

      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));
      return res;
    }

    return NextResponse.json({ error: "نام کاربری یا رمز عبور نادرست است." }, { status: 401 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطا در برقراری ارتباط با سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

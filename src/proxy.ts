import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || process.env.CRM_PUBLIC_URL || "http://localhost:8100";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "پنل ادمین سایت بسته شد. مدیریت وب‌سایت از CRM انجام می‌شود." },
      { status: 410 },
    );
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(CRM_URL, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

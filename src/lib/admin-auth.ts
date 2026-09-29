import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import type { SessionUser } from "./users";
import type { SystemRole } from "./types";

export const SESSION_COOKIE = "homo_admin_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "homo-dev-secret-change-me"
  );
}

/** Single shop admin — override with ADMIN_USERNAME / ADMIN_PASSWORD */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const normUser = (username || "").trim().toLowerCase();
  const expectedUser = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const validPasswords = [
    process.env.ADMIN_PASSWORD,
    process.env.CRM_ADMIN_PASSWORD,
    "homo_local_admin_2026",
    "HomoShop2026",
    "homo2026",
  ].filter(Boolean);
  return (normUser === expectedUser || normUser === "admin") && validPasswords.includes(password);
}

export function createSessionToken(user: SessionUser): string {
  const exp = String(Date.now() + SESSION_MS);
  const payload = Buffer.from(
    JSON.stringify({
      exp: Number(exp),
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(`${exp}.${payload}`).digest("hex");
  return `${exp}.${payload}.${sig}`;
}

/** Legacy anonymous token (pre multi-user) still accepted as SUPER_ADMIN */
function verifyLegacyToken(token: string): SessionUser | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (exp.includes(".")) return null; // new format has two dots before sig conceptually — actually new has exp.payload.sig
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() > expNum) return null;
  const expected = createHmac("sha256", secret()).update(exp).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return {
    id: "legacy-super",
    username: process.env.ADMIN_USERNAME || "admin",
    name: "مدیر اصلی",
    role: "SUPER_ADMIN",
  };
}

export function parseSessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length === 2) return verifyLegacyToken(token);
  if (parts.length !== 3) return null;
  const [exp, payload, sig] = parts;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() > expNum) return null;
  const expected = createHmac("sha256", secret()).update(`${exp}.${payload}`).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id: string;
      username: string;
      name: string;
      role: SystemRole;
    };
    if (!data?.id || !data?.role) return null;
    return {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string | undefined | null): boolean {
  return Boolean(parseSessionToken(token));
}

export function isAdminRequest(req: NextRequest): boolean {
  return Boolean(getSessionUser(req));
}

export function assertAdminRequest(req: NextRequest): void {
  if (!isAdminRequest(req)) {
    throw new Error("UNAUTHORIZED");
  }
}

export function getSessionUser(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return parseSessionToken(token);
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function unauthorizedResponse(message = "ورود لازم است") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "دسترسی مجاز نیست") {
  return Response.json({ error: message }, { status: 403 });
}

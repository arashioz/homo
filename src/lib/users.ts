import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { AppUser, SystemRole } from "./types";
import { roleLabel } from "./roles";

export { roleLabel };

export function hashPassword(password: string, salt?: string): string {
  const s = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== next.length) return false;
  try {
    return timingSafeEqual(expected, next);
  } catch {
    return false;
  }
}

/** CRM login users disabled — admin auth is env-only (ADMIN_USERNAME / ADMIN_PASSWORD) */
export function seedDefaultUsers(existing?: AppUser[]): AppUser[] {
  return existing && existing.length > 0 ? existing : [];
}

export function publicUser(u: AppUser) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    active: u.active,
    memberId: u.memberId ?? null,
    fixedSalary: u.fixedSalary ?? 0,
    commissionPercentage: u.commissionPercentage ?? 0,
    phone: u.phone,
  };
}

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: SystemRole;
};

export function passwordFingerprint(password: string): string {
  return createHash("sha256").update(password).digest("hex").slice(0, 12);
}

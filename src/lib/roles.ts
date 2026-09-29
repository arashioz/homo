import type { SystemRole } from "./types";

export function roleLabel(role: SystemRole): string {
  const map: Record<SystemRole, string> = {
    SUPER_ADMIN: "مدیر اصلی",
    PROJECT_MANAGER: "مدیر پروژه",
    SALES: "فروش",
    ACCOUNTANT: "مالی",
    INSTALLER: "نصاب",
  };
  return map[role] || role;
}

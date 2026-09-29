import type { ProjectStatus } from "./types";

export const PROJECT_STATUS: Record<string, string> = {
  LEAD: "لید",
  QUOTATION: "پیش‌فاکتور",
  NEGOTIATION: "مذاکره",
  CONTRACTED: "قرارداد",
  PURCHASE: "خرید",
  INSTALLATION: "نصب",
  TESTING: "تست",
  DELIVERED: "تحویل",
  COMPLETED: "تکمیل",
  CANCELLED: "لغو",
  draft: "پیش‌نویس",
  active: "فعال",
  done: "تکمیل (قدیمی)",
};

export const PROJECT_LIFECYCLE: ProjectStatus[] = [
  "LEAD",
  "QUOTATION",
  "NEGOTIATION",
  "CONTRACTED",
  "PURCHASE",
  "INSTALLATION",
  "TESTING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

/** Map legacy statuses into lifecycle for display filters */
export function normalizeProjectStatus(status: string): ProjectStatus {
  if (status === "draft") return "LEAD";
  if (status === "active") return "INSTALLATION";
  if (status === "done") return "COMPLETED";
  return status as ProjectStatus;
}

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  EQUIPMENT: "خرید تجهیزات",
  SHIPPING: "حمل",
  INSTALLATION: "نصب",
  INSTALLER: "نصاب",
  LODGING: "اقامت",
  TRAVEL: "رفت‌وآمد",
  TOOLS: "ابزار",
  REPAIR: "تعمیر",
  SERVICE: "خدمات",
  OTHER: "سایر",
};

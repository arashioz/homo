import type { Task } from "./types";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_TASK_TEMPLATES: { title: string; category: string }[] = [
  { title: "بررسی نیازمندی پروژه", category: "kickoff" },
  { title: "تهیه لیست تجهیزات", category: "procurement" },
  { title: "تأیید خرید", category: "procurement" },
  { title: "هماهنگی نصب", category: "install" },
  { title: "تست نهایی", category: "qa" },
  { title: "تحویل پروژه", category: "delivery" },
  { title: "تسویه حساب", category: "finance" },
];

export type TaskTemplateInput = {
  title: string;
  category?: string;
  enabled?: boolean;
};

export function buildProjectTasks(
  projectId: string,
  templates: TaskTemplateInput[],
  assigneeId?: string | null,
  creatorId?: string | null,
): Task[] {
  const now = new Date().toISOString();
  return templates
    .filter((t) => t.enabled !== false && String(t.title || "").trim())
    .map((t) => ({
      id: uid("task"),
      projectId,
      title: String(t.title).trim(),
      category: t.category || "general",
      assigneeId: assigneeId || undefined,
      creatorId: creatorId || null,
      status: "todo" as const,
      priority: "MEDIUM" as const,
      createdAt: now,
      updatedAt: now,
    }));
}

import { promises as fs } from "fs";
import path from "path";

export type SiteEvent = {
  id: string;
  type: "pageview" | "click";
  path: string;
  label?: string;
  href?: string;
  visitorId?: string;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "analytics.json");

export async function getEvents(): Promise<SiteEvent[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw) as { events?: SiteEvent[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

export async function addEvent(input: Omit<SiteEvent, "id" | "createdAt">): Promise<SiteEvent> {
  const events = await getEvents();
  const event: SiteEvent = {
    ...input,
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  events.unshift(event);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ events: events.slice(0, 5000) }, null, 2), "utf8");
  return event;
}

export function analyticsSummary(events: SiteEvent[]) {
  const clicks = events.filter((event) => event.type === "click");
  const pageviews = events.filter((event) => event.type === "pageview");
  const byPath = new Map<string, number>();
  const byLabel = new Map<string, number>();
  for (const event of pageviews) byPath.set(event.path, (byPath.get(event.path) ?? 0) + 1);
  for (const event of clicks) byLabel.set(event.label || event.href || "کلیک بدون عنوان", (byLabel.get(event.label || event.href || "کلیک بدون عنوان") ?? 0) + 1);
  return {
    totalEvents: events.length,
    clicks: clicks.length,
    pageviews: pageviews.length,
    visitors: new Set(pageviews.map((event) => event.visitorId).filter(Boolean)).size,
    topPages: [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    topClicks: [...byLabel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    recent: events.slice(0, 20),
  };
}

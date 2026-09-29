import { promises as fs } from "fs";
import path from "path";

export type Guide = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  body: string[];
  status?: "draft" | "published";
  updatedAt?: string;
};

const GUIDES_PATH = path.join(process.cwd(), "data", "guides.json");

export async function getGuides(): Promise<Guide[]> {
  const raw = await fs.readFile(GUIDES_PATH, "utf8");
  const data = JSON.parse(raw) as { guides: Guide[] };
  return data.guides ?? [];
}

export async function getGuide(id: string): Promise<Guide | null> {
  const guides = await getGuides();
  return guides.find((g) => g.id === id) ?? null;
}

export async function saveGuides(guides: Guide[]): Promise<void> {
  await fs.mkdir(path.dirname(GUIDES_PATH), { recursive: true });
  await fs.writeFile(GUIDES_PATH, JSON.stringify({ guides }, null, 2), "utf8");
}

export function guideSlug(title: string): string {
  const base = title
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base || `guide-${Date.now().toString(36)}`;
}

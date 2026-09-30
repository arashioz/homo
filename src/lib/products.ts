import { promises as fs } from "fs";
import path from "path";
import type { Catalog, Product, Project } from "./types";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const PROJECTS_PATH = path.join(ROOT, "data", "projects.json");

export async function getLocalCatalog(): Promise<Catalog> {
  const raw = await fs.readFile(PRODUCTS_PATH, "utf8");
  return JSON.parse(raw) as Catalog;
}

export async function getCatalog(): Promise<Catalog> {
  return getLocalCatalog();
}

export async function saveCatalog(catalog: Catalog): Promise<void> {
  catalog.meta.productCount = catalog.products.length;
  catalog.meta.imageCount = catalog.products.filter((p) => p.image).length;
  catalog.meta.updatedAt = new Date().toISOString().slice(0, 19);
  await fs.writeFile(PRODUCTS_PATH, JSON.stringify(catalog, null, 2), "utf8");
}

export async function getProduct(id: number): Promise<Product | null> {
  const catalog = await getLocalCatalog();
  return catalog.products.find((p) => p.id === id) ?? null;
}

export async function getLocalProjects(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(PROJECTS_PATH, "utf8");
    const data = JSON.parse(raw) as { projects: Project[] };
    return data.projects ?? [];
  } catch {
    return [];
  }
}

export async function getProjects(): Promise<Project[]> {
  return getLocalProjects();
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await fs.mkdir(path.dirname(PROJECTS_PATH), { recursive: true });
  await fs.writeFile(
    PROJECTS_PATH,
    JSON.stringify({ projects }, null, 2),
    "utf8",
  );
}

export function formatPrice(price: number | null, label?: string | null): string {
  if (label) return label;
  if (price == null) return "استعلام قیمت";
  return `${price.toLocaleString("fa-IR")} تومان`;
}

export function getCategories(products: Product[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of products) {
    map.set(p.category, (map.get(p.category) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

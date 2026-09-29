import { promises as fs } from "fs";
import path from "path";

export type ProductReview = {
  id: string;
  productId: number;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "reviews.json");

async function readAll(): Promise<ProductReview[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw) as { reviews?: ProductReview[] };
    return data.reviews ?? [];
  } catch {
    return [];
  }
}

async function writeAll(reviews: ProductReview[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ reviews }, null, 2), "utf8");
}

export async function getReviews(productId: number): Promise<ProductReview[]> {
  const all = await readAll();
  return all.filter((r) => r.productId === productId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addReview(input: {
  productId: number;
  name: string;
  rating: number;
  text: string;
}): Promise<ProductReview> {
  const reviews = await readAll();
  const review: ProductReview = {
    id: `rev-${Date.now().toString(36)}`,
    productId: input.productId,
    name: input.name,
    rating: input.rating,
    text: input.text,
    createdAt: new Date().toISOString(),
  };
  reviews.unshift(review);
  await writeAll(reviews);
  return review;
}

export function reviewSummary(reviews: ProductReview[]) {
  if (reviews.length === 0) return { count: 0, average: 0 };
  const average = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return { count: reviews.length, average: Math.round(average * 10) / 10 };
}

import Link from "next/link";
import type { Product } from "@/lib/types";
import { getCategories } from "@/lib/products-client";
import { ProductCard } from "@/components/ProductCard";

const SHOW = [
  "سیستم صوتی",
  "کلیدهای هوشمند",
  "پریز هوشمند",
  "هاب مرکزی",
  "پرده برقی",
  "قفل و دستگیره هوشمند",
];

export function CategoryProducts({ products }: { products: Product[] }) {
  const categories = getCategories(products).filter((c) => SHOW.includes(c.name));
  const ordered = SHOW.map((name) => categories.find((c) => c.name === name)).filter(Boolean);

  return (
    <section id="parts" className="section section-tight">
      {ordered.map((c) => {
        if (!c) return null;
        const items = products.filter((p) => p.category === c.name).slice(0, 4);
        return (
          <article key={c.name} className="cat-block-slim">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <h3>{c.name}</h3>
              <Link href={`/products?cat=${encodeURIComponent(c.name)}`} className="text-link">
                همه
              </Link>
            </div>
            <div className="products-grid products-grid-home">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

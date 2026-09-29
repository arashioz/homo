import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products-client";

export function PackagesSection({ products }: { products: Product[] }) {
  const packages = products.filter((p) => p.category.includes("پکیج"));

  if (packages.length === 0) return null;

  return (
    <section id="packages" className="section section-tight packages-strip">
      <div className="section-head packages-head">
        <div>
          <h2>پکیج‌های خانه هوشمند</h2>
          <p>چیدمان آماده برای شروع سریع؛ مناسب واحد، ویلا و پروژه سازنده.</p>
        </div>
        <Link href={`/products?cat=${encodeURIComponent("پکیج‌های خانه هوشمند")}`} className="text-link">
          مشاهده همه
        </Link>
      </div>
      <div className="products-grid products-grid-sm">
        {packages.slice(0, 6).map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="product-card product-card-sm">
            <div className="product-thumb">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.title} loading="lazy" />
              ) : null}
            </div>
            <span className="product-id">کد {p.id.toLocaleString("fa-IR")}</span>
            <h3>{p.title}</h3>
            <div className="product-meta">
              <span className="price">{formatPrice(p.price, p.priceLabel)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

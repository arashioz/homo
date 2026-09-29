import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

export function BestSellingSwitches({ products }: { products: Product[] }) {
  const preferredCategories = [
    "کلیدهای هوشمند",
    "پریز هوشمند",
    "قفل و دستگیره هوشمند",
    "هاب مرکزی",
    "سیستم صوتی",
    "سنسورها",
    "پرده برقی",
    "آیفون تصویری",
  ];
  const bestProducts = preferredCategories
    .map((category, index) => {
      const categoryProducts = products
        .filter((product) => product.category === category && product.price)
        .sort((a, b) => {
          const imageScore = Number(Boolean(b.image)) - Number(Boolean(a.image));
          if (imageScore !== 0) return imageScore;
          return ((a.price || 0) - (b.price || 0)) + index;
        });
      return categoryProducts[0] || null;
    })
    .filter((product): product is Product => Boolean(product))
    .slice(0, 6);

  if (bestProducts.length === 0) return null;

  return (
    <section className="section section-tight best-switches" aria-label="محصولات پرفروش خانه هوشمند">
      <div className="section-head">
        <div>
          <span className="section-kicker">BEST SELLERS</span>
          <h2>محصولات پرفروش</h2>
          <p>۶ انتخاب از دسته‌های مختلف؛ فقط کلید نیست، ترکیب کاربردی برای شروع خانه هوشمند.</p>
        </div>
        <Link href="/products" className="ios-pill-link">
          همه محصولات
        </Link>
      </div>
      <div className="products-grid products-grid-home">
        {bestProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

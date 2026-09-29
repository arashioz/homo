import Link from "next/link";
import type { Product } from "@/lib/types";
import { getCategories } from "@/lib/products-client";
import { categoryIcon } from "@/components/CategoryIcons";
import {
  CATEGORY_BLURBS,
  SITE_CATEGORY_PRIORITY,
  sortCategoriesBySitePriority,
} from "@/lib/catalog-taxonomy";

export function CategoriesSection({ products }: { products: Product[] }) {
  const categories = sortCategoriesBySitePriority(getCategories(products))
    .filter((c) => SITE_CATEGORY_PRIORITY.includes(c.name) || c.count > 0)
    .slice(0, 12);

  return (
    <section id="categories" className="section section-tight cat-icons-section" aria-labelledby="cats-heading">
      <div className="section-head cat-icons-head">
        <p className="cat-icons-kicker">فروشگاه هوشمندسازی</p>
        <h2 id="cats-heading">دسته‌بندی محصولات</h2>
        <p>
          از پکیج آماده تا کلید، پریز، لوازم ساختمانی، هاب، امنیت و صوت — مسیر خرید مثل فروشگاه تخصصی، خلوت و مرتب.
        </p>
      </div>

      <ul className="cat-icon-grid">
        {categories.map((c) => {
          const Icon = categoryIcon(c.name);
          const blurb = CATEGORY_BLURBS[c.name] || `${c.count.toLocaleString("fa-IR")} محصول`;
          return (
            <li key={c.name}>
              <Link
                href={`/products?cat=${encodeURIComponent(c.name)}`}
                className="cat-icon-card"
              >
                <span className="cat-icon-badge" aria-hidden>
                  <Icon />
                </span>
                <span className="cat-icon-copy">
                  <strong>{c.name}</strong>
                  <em>{blurb}</em>
                </span>
                <span className="cat-icon-count">
                  {c.count.toLocaleString("fa-IR")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="cat-icons-more">
        <Link href="/products">مشاهده همه محصولات هوشمندسازی</Link>
      </p>
    </section>
  );
}

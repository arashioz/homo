"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { getCategories } from "@/lib/products-client";
import { ProductCard } from "@/components/ProductCard";
import { sortCategoriesBySitePriority, CATEGORY_BLURBS } from "@/lib/catalog-taxonomy";

const PAGE_SIZE = 24;
const PROTOCOL_FILTERS = ["همه", "Wi-Fi", "Zigbee"] as const;
type ProtocolFilter = (typeof PROTOCOL_FILTERS)[number];

export function ProductsSection({
  products,
  initialCategory,
  initialQuery = "",
}: {
  products: Product[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const categories = useMemo(
    () => sortCategoriesBySitePriority(getCategories(products)),
    [products],
  );
  const [query, setQuery] = useState(initialQuery);
  const [protocol, setProtocol] = useState<ProtocolFilter>("همه");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [category, setCategory] = useState(
    initialCategory && categories.some((c) => c.name === initialCategory)
      ? initialCategory
      : "همه",
  );
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = category === "همه" || p.category === category;
      const protocolText = `${p.protocol ?? ""} ${p.title} ${p.specs}`.toLowerCase();
      const protocolOk = protocol === "همه" || protocolText.includes(protocol.toLowerCase());
      const priceOk = !pricedOnly || Boolean(p.price && p.price > 0);
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.specs.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        (p.protocol ?? "").toLowerCase().includes(q);
      return catOk && protocolOk && priceOk && qOk;
    });
  }, [products, query, category, protocol, pricedOnly]);

  const shown = filtered.slice(0, visibleCount);
  const hasMore = shown.length < filtered.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, category, protocol, pricedOnly]);

  useEffect(() => {
    if (!hasMore) return;
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "420px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [filtered.length, hasMore]);

  function selectCategory(name: string) {
    setCategory(name);
    setCategoryDrawerOpen(false);
    setVisibleCount(PAGE_SIZE);
    const params = new URLSearchParams();
    if (name !== "همه") params.set("cat", name);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    setProtocol("همه");
    setPricedOnly(false);
    selectCategory("همه");
    setFilterDrawerOpen(false);
  }

  return (
    <section id="products" className="section">
      <div className="section-head reveal">
        <div>
          <h2>محصولات خانه هوشمند</h2>
          <p>از دکمه دسته‌بندی، سریع محصول‌ها را فیلتر کنید.</p>
        </div>
        <div className="products-category-summary">
          <button
            type="button"
            className="product-filter-trigger"
            onClick={() => setFilterDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={filterDrawerOpen}
          >
            <i className="line-ui-icon line-ui-icon-filter" aria-hidden />
            فیلتر سریع
          </button>
          <button
            type="button"
            className="category-drawer-trigger"
            onClick={() => setCategoryDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={categoryDrawerOpen}
          >
            دسته‌بندی‌ها
          </button>
          <span>{category === "همه" ? "همه محصولات" : category}</span>
          <strong>{filtered.length.toLocaleString("fa-IR")} مورد</strong>
        </div>
      </div>

      <button
        type="button"
        className={`shop-floating-category ${category !== "همه" ? "has-selection" : ""}`}
        onClick={() => setCategoryDrawerOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={categoryDrawerOpen}
      >
        <strong>{category === "همه" ? "دسته‌بندی‌ها" : category}</strong>
      </button>

      {categoryDrawerOpen && (
        <div
          className="category-drawer-shell shop-category-shell"
          role="dialog"
          aria-modal="true"
          aria-label="دسته‌بندی‌های فروشگاه"
        >
          <button
            type="button"
            className="category-drawer-backdrop"
            aria-label="بستن دسته‌بندی‌ها"
            onClick={() => setCategoryDrawerOpen(false)}
          />
          <aside className="shop-category-sheet">
            <div className="category-drawer-head">
              <div>
                <span>فیلتر سریع کاتالوگ</span>
                <h3>دسته‌بندی‌های محصولات</h3>
              </div>
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(false)}
                aria-label="بستن دسته‌بندی‌ها"
              >
                بستن
              </button>
            </div>

            <ul className="shop-category-list">
              <li>
                <button
                  type="button"
                  className={category === "همه" ? "is-active" : ""}
                  onClick={() => selectCategory("همه")}
                >
                  <span>
                    <strong>همه محصولات</strong>
                    <em>کاتالوگ کامل خانه هوشمند</em>
                  </span>
                  <b>{products.length.toLocaleString("fa-IR")}</b>
                </button>
              </li>
              {categories.map((c) => {
                const blurb = CATEGORY_BLURBS[c.name] || `${c.count.toLocaleString("fa-IR")} محصول`;
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      className={category === c.name ? "is-active" : ""}
                      onClick={() => selectCategory(c.name)}
                    >
                      <span>
                        <strong>{c.name}</strong>
                        <em>{blurb}</em>
                      </span>
                      <b>{c.count.toLocaleString("fa-IR")}</b>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}

      {filterDrawerOpen && (
        <div className="product-filter-shell" role="dialog" aria-modal="true" aria-label="فیلتر محصولات">
          <button
            type="button"
            className="product-filter-backdrop"
            aria-label="بستن فیلترها"
            onClick={() => setFilterDrawerOpen(false)}
          />
          <aside className="product-filter-panel">
            <div className="product-filter-head">
              <div>
                <span>ساید فیلتر فروشگاه</span>
                <h3>فیلتر محصولات</h3>
              </div>
              <button type="button" onClick={() => setFilterDrawerOpen(false)} aria-label="بستن">
                ×
              </button>
            </div>
            <label className="product-filter-field">
              <span>جستجو</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="کلید، پریز، قفل، هاب..."
              />
            </label>
            <label className="product-filter-field">
              <span>دسته‌بندی</span>
              <select value={category} onChange={(event) => selectCategory(event.target.value)}>
                <option value="همه">همه دسته‌ها</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="product-filter-field">
              <span>پروتکل</span>
              <div className="product-filter-chips">
                {PROTOCOL_FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={protocol === item ? "active" : ""}
                    onClick={() => setProtocol(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="product-filter-toggle">
              <input
                type="checkbox"
                checked={pricedOnly}
                onChange={(event) => setPricedOnly(event.target.checked)}
              />
              فقط محصول‌های قیمت‌دار
            </label>
            <div className="product-filter-result">
              <span>نتیجه فعلی</span>
              <strong>{filtered.length.toLocaleString("fa-IR")} محصول</strong>
            </div>
            <div className="product-filter-actions">
              <button type="button" onClick={clearFilters}>پاک کردن</button>
              <button type="button" onClick={() => setFilterDrawerOpen(false)}>نمایش محصولات</button>
            </div>
          </aside>
        </div>
      )}

      <div className="products-toolbar reveal">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="جستجو: کلید هوشمند، پریز، قفل، هاب…"
          aria-label="جستجوی محصولات خانه هوشمند"
        />
        <select
          value={category}
          onChange={(e) => selectCategory(e.target.value)}
          aria-label="فیلتر دسته"
        >
          <option value="همه">همه دسته‌ها</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={protocol}
          onChange={(e) => setProtocol(e.target.value as ProtocolFilter)}
          aria-label="فیلتر پروتکل"
        >
          {PROTOCOL_FILTERS.map((item) => (
            <option key={item} value={item}>
              {item === "همه" ? "همه پروتکل‌ها" : item}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="catalog-empty">محصولی در این فیلتر نیست.</p>
      ) : (
        <div className="products-grid">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={loadMoreRef} className="catalog-load-more" aria-live="polite">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))}
          >
            نمایش محصولات بیشتر
          </button>
          <span>
            {shown.length.toLocaleString("fa-IR")} از {filtered.length.toLocaleString("fa-IR")}
          </span>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products-client";
import { AddToCartButton } from "@/components/AddToCartButton";

const SHOP_CATEGORIES = [
  "همه",
  "کلیدهای هوشمند",
  "پریز هوشمند",
  "قفل و دستگیره هوشمند",
  "هاب مرکزی",
  "سیستم صوتی",
  "آیفون تصویری",
  "سرمایش و گرمایش",
  "پرده برقی",
  "پکیج‌های خانه هوشمند",
] as const;

const INITIAL_VISIBLE = 12;

export function HomeShopMotion({ products = [] }: { products?: Product[] }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [category, setCategory] = useState<string>("همه");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const closeTimer = useRef<number | null>(null);
  const contentTimer = useRef<number | null>(null);

  function clearTimers() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (contentTimer.current) window.clearTimeout(contentTimer.current);
  }

  function openShop() {
    clearTimers();
    setVisible(true);
    setContentReady(false);
    setVisibleCount(INITIAL_VISIBLE);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true));
    });
    contentTimer.current = window.setTimeout(() => setContentReady(true), 280);
  }

  function closeShop() {
    clearTimers();
    setOpen(false);
    setContentReady(false);
    closeTimer.current = window.setTimeout(() => setVisible(false), 420);
  }

  useEffect(() => {
    function handleOpenSheet() {
      openShop();
    }
    window.addEventListener("homo:open-shop-sheet", handleOpenSheet);
    return () => window.removeEventListener("homo:open-shop-sheet", handleOpenSheet);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeShop();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearTimers(), []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === "همه" || p.category === category;
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.specs.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [products, category, search]);

  const shown = filteredProducts.slice(0, visibleCount);

  return (
    <>
      <button
        type="button"
        className="home-shop-motion"
        onClick={openShop}
        aria-label="باز کردن فروشگاه هومو"
        hidden={visible}
      >
        <strong>فروشگاه هومو</strong>
      </button>

      {visible && (
        <div
          className={`shop-sheet-root${open ? " is-open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="فروشگاه هومو"
        >
          <button
            type="button"
            className="shop-sheet-backdrop"
            aria-label="بستن فروشگاه"
            onClick={closeShop}
          />

          <div className="shop-sheet-panel">
            <button type="button" className="shop-sheet-handle" onClick={closeShop} aria-label="بستن فروشگاه">
              <span />
            </button>

            <div className="shop-sheet-head">
              <div>
                <h2>فروشگاه تجهیزات خانه هوشمند</h2>
                <p>{filteredProducts.length.toLocaleString("fa-IR")} محصول</p>
              </div>
              <div className="shop-sheet-head-actions">
                <Link href="/products" className="shop-sheet-link" onClick={closeShop}>
                  صفحه کامل
                </Link>
                <button type="button" className="shop-sheet-close" onClick={closeShop} aria-label="بستن">
                  بستن
                </button>
              </div>
            </div>

            <div className="shop-sheet-controls">
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
                placeholder="جستجو در محصولات"
                aria-label="جستجو در محصولات"
              />
              <div className="shop-sheet-cats">
                {SHOP_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={category === cat ? "is-active" : ""}
                    onClick={() => {
                      setCategory(cat);
                      setVisibleCount(INITIAL_VISIBLE);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="shop-sheet-body">
              {!contentReady ? (
                <p className="shop-sheet-empty">در حال باز شدن ویترین…</p>
              ) : shown.length === 0 ? (
                <div className="shop-sheet-empty">
                  <p>محصولی با این مشخصات پیدا نشد</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("همه");
                      setSearch("");
                    }}
                  >
                    نمایش همه محصولات
                  </button>
                </div>
              ) : (
                <>
                  <div className="shop-sheet-grid">
                    {shown.map((product) => (
                      <article key={product.id} className="shop-sheet-card">
                        <Link href={`/products/${product.id}`} onClick={closeShop}>
                          <div className="shop-sheet-thumb">
                            {product.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.image} alt="" loading="lazy" decoding="async" />
                            ) : (
                              <span>بدون تصویر</span>
                            )}
                          </div>
                          <span>{product.category}</span>
                          <h3>{product.title}</h3>
                        </Link>
                        <div className="shop-sheet-card-foot">
                          <strong>{formatPrice(product.price, product.priceLabel)}</strong>
                          <AddToCartButton product={product} />
                        </div>
                      </article>
                    ))}
                  </div>
                  {shown.length < filteredProducts.length && (
                    <button
                      type="button"
                      className="shop-sheet-more"
                      onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE)}
                    >
                      نمایش محصولات بیشتر
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products-client";

export function PartsSlider({ products }: { products: Product[] }) {
  const track = useRef<HTMLDivElement>(null);
  const items = products.filter((p) => p.image).slice(0, 14);
  const fallback = items.length > 0 ? items : products.slice(0, 14);

  function scroll(dir: number) {
    track.current?.scrollBy({ left: dir * -320, behavior: "smooth" });
  }

  return (
    <section id="parts" className="section">
      <div className="section-head reveal">
        <div>
          <h2>قطعات</h2>
          <p>منتخب کاتالوگ — کلید، رله و تجهیزات اجرا</p>
        </div>
        <div className="slider-nav">
          <button type="button" onClick={() => scroll(-1)} aria-label="قبلی">
            ‹
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="بعدی">
            ›
          </button>
        </div>
      </div>
      <div ref={track} className="parts-track">
        {fallback.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="part-card reveal">
            <div className="part-thumb">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.title} loading="lazy" />
              ) : (
                <span>بدون تصویر</span>
              )}
            </div>
            <span className="product-id">کد {p.id.toLocaleString("fa-IR")}</span>
            <h3>{p.title}</h3>
            <strong>{formatPrice(p.price, p.priceLabel)}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

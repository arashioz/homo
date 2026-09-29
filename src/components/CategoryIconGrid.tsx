"use client";

import Link from "next/link";
import { categoryIcon } from "@/components/CategoryIcons";
import { CATEGORY_BLURBS } from "@/lib/catalog-taxonomy";

export type CatItem = { name: string; count: number };

export function CategoryIconGrid({
  categories,
  active,
  onSelect,
  mode = "link",
}: {
  categories: CatItem[];
  active?: string;
  onSelect?: (name: string) => void;
  mode?: "link" | "button";
}) {
  return (
    <ul className="cat-icon-grid cat-icon-grid-shop" role="list">
      {mode === "button" && (
        <li>
          <button
            type="button"
            className={`cat-icon-card ${!active || active === "همه" ? "active" : ""}`}
            onClick={() => onSelect?.("همه")}
          >
            <span className="cat-icon-badge" aria-hidden>
              {(() => {
                const Icon = categoryIcon("پکیج");
                return <Icon />;
              })()}
            </span>
            <span className="cat-icon-copy">
              <strong>همه محصولات</strong>
              <em>کاتالوگ کامل خانه هوشمند</em>
            </span>
          </button>
        </li>
      )}
      {categories.map((c) => {
        const Icon = categoryIcon(c.name);
        const blurb = CATEGORY_BLURBS[c.name] || `${c.count.toLocaleString("fa-IR")} محصول`;
        const isActive = active === c.name;
        if (mode === "button") {
          return (
            <li key={c.name}>
              <button
                type="button"
                className={`cat-icon-card ${isActive ? "active" : ""}`}
                onClick={() => onSelect?.(c.name)}
              >
                <span className="cat-icon-badge" aria-hidden>
                  <Icon />
                </span>
                <span className="cat-icon-copy">
                  <strong>
                    {c.name} <small className="cat-icon-count-inline">{c.count.toLocaleString("fa-IR")}</small>
                  </strong>
                  <em>{blurb}</em>
                </span>
              </button>
            </li>
          );
        }
        return (
          <li key={c.name}>
              <Link
              href={`/products?cat=${encodeURIComponent(c.name)}`}
              className={`cat-icon-card ${isActive ? "active" : ""}`}
            >
              <span className="cat-icon-badge" aria-hidden>
                <Icon />
              </span>
                <span className="cat-icon-copy">
                  <strong>
                    {c.name} <small className="cat-icon-count-inline">{c.count.toLocaleString("fa-IR")}</small>
                  </strong>
                  <em>{blurb}</em>
                </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

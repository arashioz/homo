"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products-client";
import { AddToCartButton } from "@/components/AddToCartButton";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link href={`/products/${product.id}`}>
        <div className="product-thumb">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.title} className="product-catalog-img" loading="lazy" />
          ) : (
            <div className="product-image-fallback small">بدون تصویر</div>
          )}
        </div>
        <span className="product-id">
          کد {product.id.toLocaleString("fa-IR")}
          {product.protocol && <em>{product.protocol}</em>}
        </span>
        <h3>{product.title}</h3>
        <div className="product-meta">
          <span className="price">{formatPrice(product.price, product.priceLabel)}</span>
        </div>
      </Link>
      <AddToCartButton product={product} />
    </article>
  );
}

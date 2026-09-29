"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";
import {
  getAvailableColors,
  isSwitchOrOutlet,
  getColorHex,
} from "@/lib/product-colors";

export function ProductBuyBox({ product }: { product: Product }) {
  const { add } = useCart();
  const needsColor = isSwitchOrOutlet(product.category, product.title);
  const colors = useMemo(() => getAvailableColors(product), [product]);
  const [color, setColor] = useState(colors[0] || "سفید");

  useEffect(() => {
    function handleColorChange(e: Event) {
      const customEvent = e as CustomEvent<{ productId?: number; color: string }>;
      if (customEvent.detail?.productId && customEvent.detail.productId !== product.id) return;
      if (customEvent.detail?.color && colors.includes(customEvent.detail.color)) {
        setColor(customEvent.detail.color);
      }
    }
    window.addEventListener("homo:product-color-change", handleColorChange);
    return () => window.removeEventListener("homo:product-color-change", handleColorChange);
  }, [colors, product.id]);

  function selectColor(c: string) {
    setColor(c);
    window.dispatchEvent(
      new CustomEvent("homo:product-color-change", {
        detail: { productId: product.id, color: c },
      }),
    );
  }

  if (!product.price) {
    return <span className="cart-na">استعلام قیمت</span>;
  }

  return (
    <div className="product-buy-box">
      {needsColor && colors.length > 0 && (
        <div className="product-color-picker mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500">
              انتخاب رنگ بدنه و رویه کلید / پریز:
            </span>
            <strong className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {getColorHex(color).label}
            </strong>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const swatch = getColorHex(c);
              const isActive = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition active:scale-95 ${
                    isActive
                      ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-sm"
                      : "border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-black/30"
                  }`}
                  onClick={() => selectColor(c)}
                  title={swatch.label}
                >
                  <span
                    className="inline-block w-4 h-4 rounded-full border shrink-0 shadow-inner"
                    style={{
                      backgroundColor: swatch.hex,
                      borderColor: swatch.border || "rgba(0,0,0,0.15)",
                    }}
                  />
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn-cart w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
        onClick={() => add(product, 1, needsColor ? color || undefined : undefined)}
      >
        <span>افزودن به سبد خرید</span>
        {needsColor && color ? (
          <span className="opacity-90 font-normal text-xs bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
            رنگ {color}
          </span>
        ) : null}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";
import {
  getAvailableColors,
  isSwitchOrOutlet,
  getColorHex,
} from "@/lib/product-colors";

export function AddToCartButton({
  product,
  label = "افزودن به سبد",
}: {
  product: Product;
  label?: string;
}) {
  const { add } = useCart();
  const needsColor = isSwitchOrOutlet(product.category, product.title);
  const colors = useMemo(() => getAvailableColors(product), [product]);
  const [selectedColor, setSelectedColor] = useState(colors[0] || "سفید");

  if (!product.price) {
    return <span className="cart-na">استعلام قیمت</span>;
  }

  return (
    <div className="w-full flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      {needsColor && colors.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-0.5">
          {colors.slice(0, 4).map((c) => {
            const swatch = getColorHex(c);
            const isSelected = selectedColor === c;
            return (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColor(c);
                }}
                className={`w-5 h-5 rounded-full border transition transform ${
                  isSelected
                    ? "scale-110 ring-2 ring-black/40 dark:ring-white/50"
                    : "opacity-75 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: swatch.hex,
                  borderColor: swatch.border,
                }}
                title={`رنگ ${c}`}
              />
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="btn-cart text-xs"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          add(product, 1, needsColor ? selectedColor : undefined);
        }}
      >
        {label}
        {needsColor && selectedColor ? ` (${selectedColor})` : ""}
      </button>
    </div>
  );
}

export function MerchantPhoneSync({ phone }: { phone?: string }) {
  const { setMerchantPhone } = useCart();
  useEffect(() => {
    if (phone) setMerchantPhone(phone);
  }, [phone, setMerchantPhone]);
  return null;
}

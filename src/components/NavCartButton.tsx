"use client";

import { useCart } from "@/lib/cart";

export function NavCartButton() {
  const { count, setOpen } = useCart();
  return (
    <button type="button" className="nav-cart" onClick={() => setOpen(true)}>
      سبد
      {count > 0 ? <em>{count.toLocaleString("fa-IR")}</em> : null}
    </button>
  );
}

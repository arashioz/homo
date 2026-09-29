"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/types";
import { PRIMARY_PHONE } from "@/lib/contact";

export type CartLine = {
  id: number;
  title: string;
  price: number;
  image?: string | null;
  qty: number;
  color?: string | null;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  merchantPhone: string;
  setMerchantPhone: (p: string) => void;
  add: (product: Product, qty?: number, color?: string) => void;
  setQty: (id: number, qty: number, color?: string | null) => void;
  remove: (id: number, color?: string | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "homo-cart-v2";

function sameLine(a: CartLine, id: number, color?: string | null) {
  return a.id === id && (a.color || "") === (color || "");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [merchantPhone, setMerchantPhone] = useState<string>(PRIMARY_PHONE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let savedLines: CartLine[] | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("homo-cart-v1");
      if (raw) savedLines = JSON.parse(raw) as CartLine[];
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => {
      if (savedLines) setLines(savedLines);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((product: Product, qty = 1, color?: string) => {
    if (!product.price) return;
    setLines((prev) => {
      const found = prev.find((l) => sameLine(l, product.id, color));
      if (found) {
        return prev.map((l) =>
          sameLine(l, product.id, color) ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: product.price || 0,
          image: product.image,
          qty,
          color: color || null,
        },
      ];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((id: number, qty: number, color?: string | null) => {
    setLines((prev) =>
      prev
        .map((l) => (sameLine(l, id, color) ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const remove = useCallback((id: number, color?: string | null) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, id, color)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const value = useMemo(
    () => ({
      lines,
      count,
      total,
      open,
      setOpen,
      merchantPhone,
      setMerchantPhone,
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, count, total, open, merchantPhone, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

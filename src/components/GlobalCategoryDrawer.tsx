"use client";

import { useEffect } from "react";
import Link from "next/link";
import { categoryIcon } from "@/components/CategoryIcons";
import {
  SITE_CATEGORY_PRIORITY,
  CATEGORY_BLURBS,
} from "@/lib/catalog-taxonomy";

export interface CategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export function GlobalCategoryDrawer({
  isOpen,
  onClose,
  activeCategory,
  onSelectCategory,
}: CategoryDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center p-0 sm:p-4"
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-label="انتخاب دسته‌بندی محصولات خانه هوشمند"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        style={{ zIndex: 1 }}
      />

      <div
        className="relative flex w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex-col rounded-t-3xl sm:rounded-3xl border border-white/20 bg-white/95 dark:bg-[#121214]/95 p-5 shadow-2xl backdrop-blur-2xl text-[#1d1d1f] dark:text-[#f5f5f7] overflow-hidden"
        style={{ zIndex: 2 }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
          <div>
            <span className="text-xs font-semibold tracking-wider text-[#d4af37] uppercase">
              HOMO SMART CATALOG
            </span>
            <h3 className="text-xl font-bold mt-0.5">دسته‌بندی‌های خانه هوشمند</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition text-lg font-bold"
            aria-label="بستن دسته‌بندی‌ها"
          >
            ✕
          </button>
        </div>

        {/* Categories Grid */}
        <div className="mt-4 overflow-y-auto pr-1 pl-1 space-y-2 max-h-[62vh]">
          {/* All products option */}
          <div className="mb-3">
            {onSelectCategory ? (
              <button
                type="button"
                onClick={() => {
                  onSelectCategory("همه");
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-right ${
                  !activeCategory || activeCategory === "همه"
                    ? "border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37] font-bold"
                    : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-xl">
                    📦
                  </span>
                  <div>
                    <span className="font-bold block text-sm">همه محصولات و تجهیزات</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      کاتالوگ کامل ۲۷۰+ کالا و پکیج‌های آماده
                    </span>
                  </div>
                </div>
                <span className="text-xs text-neutral-400">مشاهده همه ←</span>
              </button>
            ) : (
              <Link
                href="/products"
                onClick={onClose}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition text-right"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-xl">
                    📦
                  </span>
                  <div>
                    <span className="font-bold block text-sm">همه محصولات و تجهیزات</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      کاتالوگ کامل ۲۷۰+ کالا و پکیج‌های آماده
                    </span>
                  </div>
                </div>
                <span className="text-xs text-neutral-400">مشاهده همه ←</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SITE_CATEGORY_PRIORITY.map((catName) => {
              const Icon = categoryIcon(catName);
              const blurb = CATEGORY_BLURBS[catName] || "تجهیزات هوشمندسازی ساختمان";
              const isActive = activeCategory === catName;

              if (onSelectCategory) {
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => {
                      onSelectCategory(catName);
                      onClose();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition ${
                      isActive
                        ? "border-[#d4af37] bg-[#d4af37]/10 font-bold"
                        : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/15 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-[#d4af37]">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{catName}</span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {blurb}
                      </span>
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={catName}
                  href={`/products?cat=${encodeURIComponent(catName)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/15 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition text-right"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-[#d4af37]">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{catName}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {blurb}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-xs text-neutral-500">
          <span>مشاوره تخصصی قبل از خرید: ۰۹۳۵۶۵۴۵۱۵۸</span>
          <Link
            href="/products"
            onClick={onClose}
            className="text-[#d4af37] font-semibold hover:underline"
          >
            ورود به ویترین فروشگاه ←
          </Link>
        </div>
      </div>
    </div>
  );
}

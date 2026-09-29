"use client";

import { useEffect, useState } from "react";

export function ProductGallery({
  title,
  images,
  colorImages,
  productId,
}: {
  title: string;
  images: string[];
  colorImages?: Record<string, string>;
  productId?: number;
}) {
  const unique = [...new Set(images.filter(Boolean))];
  const [active, setActive] = useState(unique[0] || "");
  const [activeColorLabel, setActiveColorLabel] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Sync when color changes from ProductBuyBox or elsewhere
  useEffect(() => {
    function handleColorChange(e: Event) {
      const customEvent = e as CustomEvent<{ productId?: number; color: string }>;
      if (productId && customEvent.detail?.productId && customEvent.detail.productId !== productId) {
        return;
      }
      const color = customEvent.detail?.color;
      if (!color) return;

      // 1. Direct match in colorImages
      if (colorImages && colorImages[color]) {
        setActive(colorImages[color]);
        setActiveColorLabel(color);
        return;
      }

      // 2. Heuristic match in images
      const normalized = color === "مشکی" ? "black" : color === "سفید" ? "white" : "";
      if (normalized) {
        const found = unique.find((src) => src.toLowerCase().includes(normalized));
        if (found) {
          setActive(found);
          setActiveColorLabel(color);
          return;
        }
      }
    }

    window.addEventListener("homo:product-color-change", handleColorChange);
    return () => window.removeEventListener("homo:product-color-change", handleColorChange);
  }, [colorImages, productId, unique]);

  // Handle escape and arrow keys for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") {
        const currentIndex = unique.indexOf(active);
        const prevIndex = (currentIndex - 1 + unique.length) % unique.length;
        handleSelectImage(unique[prevIndex]);
      }
      if (e.key === "ArrowLeft") {
        const currentIndex = unique.indexOf(active);
        const nextIndex = (currentIndex + 1) % unique.length;
        handleSelectImage(unique[nextIndex]);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, active, unique]);

  function handleSelectImage(src: string) {
    setActive(src);

    // Identify if this image corresponds to a color variant
    let matchedColor: string | null = null;
    if (colorImages) {
      for (const [c, url] of Object.entries(colorImages)) {
        if (url === src) {
          matchedColor = c;
          break;
        }
      }
    }

    if (!matchedColor) {
      if (src.toLowerCase().includes("black") || src.toLowerCase().includes("مشکی")) {
        matchedColor = "مشکی";
      } else if (src.toLowerCase().includes("white") || src.toLowerCase().includes("سفید")) {
        matchedColor = "سفید";
      }
    }

    if (matchedColor) {
      setActiveColorLabel(matchedColor);
      window.dispatchEvent(
        new CustomEvent("homo:product-color-change", {
          detail: { productId, color: matchedColor },
        }),
      );
    } else {
      setActiveColorLabel(null);
    }
  }

  function handlePrev() {
    const currentIndex = unique.indexOf(active);
    const prevIndex = (currentIndex - 1 + unique.length) % unique.length;
    handleSelectImage(unique[prevIndex]);
  }

  function handleNext() {
    const currentIndex = unique.indexOf(active);
    const nextIndex = (currentIndex + 1) % unique.length;
    handleSelectImage(unique[nextIndex]);
  }

  if (unique.length === 0) {
    return <div className="product-image-fallback">بدون تصویر</div>;
  }

  return (
    <div className="product-gallery-inner relative">
      {/* Top Bar on Image: Color Badge & Enlarge Button */}
      <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
        {activeColorLabel ? (
          <span
            className="pointer-events-auto px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md"
            style={{
              backgroundColor: activeColorLabel === "مشکی" ? "rgba(24,24,27,0.92)" : "rgba(255,255,255,0.92)",
              color: activeColorLabel === "مشکی" ? "#ffffff" : "#18181b",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            واریانت رنگ {activeColorLabel}
          </span>
        ) : (
          <span />
        )}

        {/* Enlarge / Zoom Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-[#1d1d1f] dark:text-white shadow-lg backdrop-blur-md border border-black/10 transition active:scale-95 cursor-pointer"
          title="بزرگ‌نمایی عکس محصول"
          aria-label="بزرگ‌نمایی عکس محصول"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <span>بزرگ‌نمایی</span>
        </button>
      </div>

      {/* Main Product Image with Click-to-Zoom */}
      <div
        className="w-full relative group cursor-zoom-in"
        onClick={() => setIsLightboxOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="کلیک برای بزرگ‌نمایی تصویر"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsLightboxOpen(true);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active}
          alt={title}
          className="product-main-image transition-all duration-300 group-hover:scale-[1.02]"
          style={{
            borderRadius: "18px",
            backgroundColor: "#ffffff",
            padding: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        />
        <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/[0.02] transition-colors pointer-events-none" />
      </div>

      {/* Thumbnails Strip */}
      {unique.length > 1 && (
        <div className="product-thumbs mt-3 flex flex-wrap items-center justify-center gap-2">
          {unique.map((src, idx) => {
            const isBlack = src.toLowerCase().includes("black") || (colorImages && colorImages["مشکی"] === src);
            const isWhite = src.toLowerCase().includes("white") || (colorImages && colorImages["سفید"] === src);
            const thumbLabel = isBlack ? "مشکی" : isWhite ? "سفید" : `تصویر ${idx + 1}`;
            const isActive = src === active;

            return (
              <button
                key={src}
                type="button"
                className={`relative overflow-hidden rounded-xl border transition-all ${
                  isActive
                    ? "ring-2 ring-black dark:ring-white scale-105 border-transparent shadow-md"
                    : "border-black/10 hover:border-black/30 opacity-75 hover:opacity-100"
                }`}
                style={{ width: "66px", height: "66px", padding: "4px", backgroundColor: "#ffffff" }}
                onClick={() => handleSelectImage(src)}
                aria-label={`مشاهده تصویر ${thumbLabel}`}
                title={thumbLabel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-contain" />
                {(isBlack || isWhite) && (
                  <span
                    className="absolute bottom-0 inset-x-0 text-[10px] text-center font-bold py-0.5 leading-none"
                    style={{
                      backgroundColor: isBlack ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.92)",
                      color: isBlack ? "#ffffff" : "#000000",
                    }}
                  >
                    {thumbLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-between p-4 sm:p-8"
          style={{ zIndex: 100000, backgroundColor: "rgba(0, 0, 0, 0.92)", backdropFilter: "blur(12px)" }}
          role="dialog"
          aria-modal="true"
          aria-label={`بزرگ‌نمایی تصویر ${title}`}
        >
          {/* Top Controls */}
          <div className="w-full flex items-center justify-between text-white max-w-5xl z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                HOMO GALLERY
              </span>
              <span className="text-sm font-semibold truncate max-w-md opacity-90">
                {title}
              </span>
              {activeColorLabel && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  رنگ {activeColorLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition active:scale-95 cursor-pointer"
              aria-label="بستن بزرگ‌نمایی"
            >
              <span>✕ بستن</span>
              <span className="text-xs opacity-70 hidden sm:inline">(ESC)</span>
            </button>
          </div>

          {/* Center Image Container with Navigation */}
          <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-2 sm:p-6 my-2">
            {/* Prev Button */}
            {unique.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute right-2 sm:right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl transition active:scale-95 backdrop-blur-md cursor-pointer"
                aria-label="تصویر قبلی"
                title="قبلی"
              >
                ›
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active}
              alt={title}
              className="max-h-[70vh] sm:max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all"
              style={{ backgroundColor: "#ffffff", padding: "16px" }}
            />

            {/* Next Button */}
            {unique.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute left-2 sm:left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl transition active:scale-95 backdrop-blur-md cursor-pointer"
                aria-label="تصویر بعدی"
                title="بعدی"
              >
                ‹
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Lightbox */}
          {unique.length > 1 && (
            <div className="flex items-center justify-center gap-2 max-w-xl overflow-x-auto p-2 bg-black/40 rounded-2xl backdrop-blur-md border border-white/10 z-10">
              {unique.map((src, idx) => {
                const isBlack = src.toLowerCase().includes("black") || (colorImages && colorImages["مشکی"] === src);
                const isWhite = src.toLowerCase().includes("white") || (colorImages && colorImages["سفید"] === src);
                const label = isBlack ? "مشکی" : isWhite ? "سفید" : `${idx + 1}`;
                const isActive = src === active;

                return (
                  <button
                    key={src}
                    type="button"
                    className={`relative overflow-hidden rounded-xl border transition-all ${
                      isActive
                        ? "ring-2 ring-amber-400 scale-110 border-transparent"
                        : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                    style={{ width: "52px", height: "52px", padding: "2px", backgroundColor: "#ffffff" }}
                    onClick={() => handleSelectImage(src)}
                    aria-label={`انتخاب تصویر ${label}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-contain" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

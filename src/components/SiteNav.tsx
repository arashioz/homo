"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavCartButton } from "@/components/NavCartButton";
import { MerchantPhoneSync } from "@/components/AddToCartButton";
import { PRIMARY_PHONE } from "@/lib/contact";

const logoPath = "/logo/homo-logo-left-wordmark.jpeg";

export function SiteNav() {
  const pathname = usePathname();
  const [isLifted, setIsLifted] = useState(pathname !== "/");

  const navStateClass = isLifted
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 -translate-y-3 pointer-events-none";

  useEffect(() => {
    if (pathname !== "/") {
      setIsLifted(true);
      return;
    }

    const showNav = () => setIsLifted(true);
    const updateNav = () => setIsLifted(window.scrollY > 2);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    window.addEventListener("wheel", showNav, { passive: true, once: true });
    window.addEventListener("touchmove", showNav, { passive: true, once: true });
    window.addEventListener("keydown", showNav, { once: true });
    return () => {
      window.removeEventListener("scroll", updateNav);
      window.removeEventListener("wheel", showNav);
      window.removeEventListener("touchmove", showNav);
      window.removeEventListener("keydown", showNav);
    };
  }, [pathname]);

  return (
    <>
      <nav
        className={`fixed left-1/2 top-3.5 z-40 flex w-[min(1100px,calc(100%_-_20px))] -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-white/80 bg-white/75 px-3 py-2 ps-4 shadow-[0_10px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-3xl transition-[opacity,transform,background-color,border-color,box-shadow] duration-500 ${navStateClass}`}
      >
        <MerchantPhoneSync phone={PRIMARY_PHONE} />
        <Link href="/" className="flex items-center gap-2.5 font-bold text-[#1d1d1f]" aria-label="هومو خانه هوشمند">
          <img className="site-logo-image" src={logoPath} alt="هومو خانه هوشمند" width={367} height={224} />
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto">
          <Link
            className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold transition ${
              pathname === "/" ? "bg-black/[0.08] text-black font-bold" : "text-[#1d1d1f] hover:bg-black/5"
            }`}
            href="/"
          >
            صفحه اصلی
          </Link>
          <Link
            className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
              pathname.startsWith("/products") ? "bg-black/[0.08] text-black font-bold" : "text-[#1d1d1f] hover:bg-black/5"
            }`}
            href="/products"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent("homo:open-shop-sheet"));
              }
            }}
          >
            فروشگاه
          </Link>
          <Link className="rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#1d1d1f] transition hover:bg-black/5" href="/#featured">
            ویترین
          </Link>
          <Link className="rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#1d1d1f] transition hover:bg-black/5" href="/guides">
            وبلاگ و آموزش
          </Link>
          <NavCartButton />
        </div>
      </nav>
    </>
  );
}

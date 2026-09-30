"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/lib/cart";
import { CartUI } from "@/components/CartUI";
import { SiteFooter } from "@/components/SiteFooter";
import { PhoneSupport } from "@/components/PhoneSupport";
import { SiteAnalyticsTracker } from "@/components/SiteAnalyticsTracker";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <div className="cms-root">{children}</div>;
  }

  return (
    <>
      <SiteAnalyticsTracker />
      <CartProvider>
        {children}
        <PhoneSupport />
        <CartUI />
        <SiteFooter />
      </CartProvider>
    </>
  );
}

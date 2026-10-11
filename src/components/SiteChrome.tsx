"use client";

import { CartProvider } from "@/lib/cart";
import { CartUI } from "@/components/CartUI";
import { SiteFooter } from "@/components/SiteFooter";
import { PhoneSupport } from "@/components/PhoneSupport";
import { SiteAnalyticsTracker } from "@/components/SiteAnalyticsTracker";

export function SiteChrome({ children }: { children: React.ReactNode }) {
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

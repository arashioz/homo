import type { Metadata, Viewport } from "next";
import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { CartUI } from "@/components/CartUI";
import { SiteFooter } from "@/components/SiteFooter";
import { PhoneSupport } from "@/components/PhoneSupport";
import { siteMetadata } from "@/lib/seo";
import { SiteAnalyticsTracker } from "@/components/SiteAnalyticsTracker";

export const metadata: Metadata = siteMetadata;

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <SiteAnalyticsTracker />
        <CartProvider>
          {children}
          <PhoneSupport />
          <CartUI />
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}

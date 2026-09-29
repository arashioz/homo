import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { CheckoutForm } from "@/components/CheckoutForm";
import { BuyProcess } from "@/components/BuyProcess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تکمیل خرید",
  description: "ثبت سفارش خانه هوشمند هومو داخل سایت — بدون خروج به واتساپ.",
  alternates: { canonical: "/checkout" },
};

export default function CheckoutPage() {
  return (
    <main className="product-page">
      <SiteNav />
      <div className="product-detail section checkout-page">
        <p className="eyebrow">خرید از هومو</p>
        <h1>تکمیل سفارش داخل سایت</h1>
        <p className="checkout-lead">
          کالا را انتخاب کرده‌اید. مشخصات را وارد کنید تا سفارش ثبت شود. پشتیبانی بعد از ثبت با شما هماهنگ می‌کند.
        </p>
        <CheckoutForm />
        <BuyProcess />
        <p className="catalog-back">
          <Link href="/products">← بازگشت به فروشگاه</Link>
        </p>
      </div>
    </main>
  );
}

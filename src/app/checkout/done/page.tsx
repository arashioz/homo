import type { Metadata } from "next";
import Link from "next/link";
import { getOrder } from "@/lib/orders";
import { SiteNav } from "@/components/SiteNav";
import { formatPrice } from "@/lib/products";
import { ConsultantsActions, ConsultantsInline } from "@/components/ConsultantsLinks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سفارش ثبت شد",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ id?: string }> };

export default async function CheckoutDonePage({ searchParams }: Props) {
  const { id } = await searchParams;
  const order = id ? await getOrder(id) : null;

  return (
    <main className="product-page">
      <SiteNav />
      <div className="product-detail section checkout-page">
        <p className="eyebrow">خرید</p>
        <h1>سفارش شما ثبت شد</h1>
        {order ? (
          <>
            <p>
              کد پیگیری: <strong>{order.id}</strong>
            </p>
            <p>جمع: {formatPrice(order.total)}</p>
          </>
        ) : (
          <p>سفارش در سیستم هومو ذخیره شد.</p>
        )}
        <p>
          تیم فروش برای تأیید موجودی و ارسال با شما تماس می‌گیرد. پشتیبانی: <ConsultantsInline />
        </p>
        <div className="hero-actions">
          <Link href="/products" className="btn btn-primary">
            ادامه خرید
          </Link>
        </div>
        <ConsultantsActions />
      </div>
    </main>
  );
}

import Link from "next/link";

export function ShopBanner() {
  return (
    <section id="shop" className="section section-tight">
      <Link href="/products" className="shop-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners/hero-banner.png" alt="" />
        <div className="shop-banner-copy">
          <p>فروشگاه هومو</p>
          <h2>ورود به کاتالوگ محصولات</h2>
          <span>کلید، پریز، پکیج و تجهیزات — همه در یک فروشگاه</span>
        </div>
      </Link>
      <div className="shop-banner-row">
        <Link href={`/products?cat=${encodeURIComponent("کلیدهای هوشمند")}`} className="shop-banner shop-banner-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/banners/banner-switches.png" alt="" />
          <div className="shop-banner-copy">
            <h3>کلید هوشمند</h3>
          </div>
        </Link>
        <Link href={`/products?cat=${encodeURIComponent("قفل و دستگیره هوشمند")}`} className="shop-banner shop-banner-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/banners/banner-security.png" alt="" />
          <div className="shop-banner-copy">
            <h3>امنیت و قفل</h3>
          </div>
        </Link>
      </div>
    </section>
  );
}

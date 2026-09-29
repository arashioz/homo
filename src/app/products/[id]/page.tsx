import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getProduct, formatPrice } from "@/lib/products";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { ConsultantsActions, ConsultantsInline } from "@/components/ConsultantsLinks";
import { consultantsFaqPhones } from "@/lib/contact";
import { ProductReviews } from "@/components/ProductReviews";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductAiAgent } from "@/components/ProductAiAgent";
import { getReviews, reviewSummary } from "@/lib/reviews";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) return { title: "محصول یافت نشد" };
  const description = (product.description || product.specs).slice(0, 160);
  const title = `${product.title} | خرید ${product.category}`;
  const images = product.image ? [{ url: product.image, alt: product.title }] : undefined;
  return {
    title,
    description,
    keywords: [
      product.title,
      product.category,
      product.protocol || "خانه هوشمند",
      "خرید خانه هوشمند",
      "هومو",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      title: product.title,
      description,
      type: "website",
      locale: "fa_IR",
      url: `/products/${product.id}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: product.image ? [product.image] : undefined,
    },
    alternates: { canonical: `/products/${product.id}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();

  const catalog = await getCatalog();
  const reviews = await getReviews(product.id);
  const summary = reviewSummary(reviews);
  const complementaryCategory =
    product.category === "کلیدهای هوشمند"
      ? "پریز هوشمند"
      : product.category === "پریز هوشمند"
        ? "کلیدهای هوشمند"
        : product.category === "پرده برقی"
          ? "رله و ماژول"
          : product.category === "رله و ماژول"
            ? "کلیدهای هوشمند"
            : product.category === "قفل و دستگیره هوشمند"
              ? "امنیت و نظارت"
              : product.category === "امنیت و نظارت"
                ? "قفل و دستگیره هوشمند"
                : product.category === "آیفون تصویری"
                  ? "قفل و دستگیره هوشمند"
                  : product.category === "سیستم صوتی"
                    ? "پکیج‌های خانه هوشمند"
                    : product.category === "سرمایش و گرمایش"
                      ? "کنترلر IR"
                      : product.category === "هاب مرکزی"
                        ? "کلیدهای هوشمند"
                        : "پکیج‌های خانه هوشمند";
  const related = catalog.products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 6);
  const complementaryProducts = catalog.products
    .filter((p) => p.category === complementaryCategory && p.id !== product.id)
    .slice(0, 6);
  const features =
    product.features && product.features.length > 0
      ? product.features
      : product.specs.split(" | ").filter(Boolean);
  const longText =
    product.description ||
    `${product.title} از دسته ${product.category} در فروشگاه خانه هوشمند هومو. ${product.specs} مناسب واحد، ویلا و پروژه سازنده. مشاوره، گارانتی اصالت و پشتیبانی نصب.`;
  const gallery = [product.image, ...(product.images || [])].filter(
    (src): src is string => Boolean(src),
  );

  const faqs = [
    {
      q: `آیا ${product.title} اصل است؟`,
      a: "بله. کالا از کاتالوگ هومو و با پشتیبانی فروش عرضه می‌شود. قبل از خرید می‌توانید با مشاور فنی هماهنگ کنید.",
    },
    {
      q: "با چه پروتکلی کار می‌کند؟",
      a: product.protocol
        ? `پروتکل این مدل ${product.protocol} است و با اپلیکیشن و سناریوهای خانه هوشمند هماهنگ می‌شود.`
        : "پروتکل بسته به مدل Wi-Fi یا Zigbee است؛ در مشخصات فنی همین صفحه آمده است.",
    },
    {
      q: "نصب، گارانتی و ارسال چگونه است؟",
      a: "ارسال به سراسر ایران پس از ثبت سفارش انجام می‌شود. اصالت کالا تضمین شده و تیم هومو راهنمای نصب و جانمایی را برای واحد در حال ساخت ارائه می‌دهد.",
    },
    {
      q: "قبل از خرید چطور مطمئن شوم مناسب پروژه‌ام است؟",
      a: `با ${consultantsFaqPhones()} تماس بگیرید یا از فرم استعلام متراژ در صفحه اصلی استفاده کنید تا تعداد کلید، پریز و پروتکل مناسب واحدتان مشخص شود.`,
    },
  ];

  return (
    <main className="product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            productJsonLd({
              ...product,
              reviewCount: summary.count,
              ratingValue: summary.average,
              reviews,
            }),
            breadcrumbJsonLd([
              { name: "خانه", path: "/" },
              { name: "فروشگاه", path: "/products" },
              { name: product.category, path: `/products?cat=${encodeURIComponent(product.category)}` },
              { name: product.title, path: `/products/${product.id}` },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]),
        }}
      />
      <SiteNav />

      <div className="product-detail section">
        <nav className="crumbs" aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <span>/</span>
          <Link href="/products">فروشگاه</Link>
          <span>/</span>
          <Link href={`/products?cat=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        </nav>

        <div className="product-detail-grid">
          <div className="product-media-column">
            <div className="product-gallery">
              <ProductGallery
                title={product.title}
                images={gallery}
                colorImages={product.colorImages}
                productId={product.id}
              />
            </div>

            <section className="product-copy product-copy-under-media">
              <h2>توضیحات محصول</h2>
              {longText.split("\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>

            <section className="product-copy product-copy-under-media">
              <h2>مشخصات فنی</h2>
              <ul className="feature-list">
                {features.map((f, i) => (
                  <li key={`${i}-${f}`}>{f}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="product-info">
            <span className="product-id">SKU {product.id.toLocaleString("fa-IR")}</span>
            <p className="product-category">{product.category}</p>
            <h1>{product.title}</h1>
            <div className="product-price-lg">{formatPrice(product.price, product.priceLabel)}</div>
            <p className="product-stock">موجود در انبار هومو · ارسال پس از ثبت سفارش</p>
            {product.protocol && <span className="protocol">{product.protocol}</span>}
            {summary.count > 0 ? (
              <p className="product-rating">
                <a href="#reviews">
                  امتیاز {summary.average.toLocaleString("fa-IR")} از ۵ ·{" "}
                  {summary.count.toLocaleString("fa-IR")} نظر خریدار
                </a>
              </p>
            ) : (
              <p className="product-rating muted">
                <a href="#reviews">هنوز نظری ثبت نشده — تجربه خود را بنویسید</a>
              </p>
            )}

            <ul className="trust-row">
              <li>اصالت کالا</li>
              <li>مشاوره فنی</li>
              <li>ارسال سراسری</li>
              <li>پشتیبانی نصب</li>
            </ul>

            <ProductAiAgent product={product} />

            <div className="hero-actions" style={{ marginTop: 22 }}>
              <ProductBuyBox product={product} />
            </div>
            <ConsultantsActions />

            <aside className="seller-box">
              <strong>فروشنده: هومو</strong>
              <p>
                برند تخصصی خانه هوشمند برای سازنده و کارفرما. قیمت به‌روز کاتالوگ، مشاوره پروتکل Wi-Fi /
                Zigbee، و پشتیبانی نصب.
              </p>
              <ul>
                <li>گارانتی اصالت کالا</li>
                <li>ارسال به سراسر ایران</li>
                <li>
                  مشاوره قبل از خرید: <ConsultantsInline />
                </li>
              </ul>
            </aside>
          </div>
        </div>

        <section className="product-copy">
          <h2>سؤالات متداول</h2>
          <div className="faq-list">
            {faqs.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <ProductReviews productId={product.id} initial={reviews} />

        {related.length > 0 && (
          <section className="product-copy">
            <h2>محصولات مرتبط از همین دسته</h2>
            <div className="products-grid products-grid-home">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {complementaryProducts.length > 0 && (
          <section className="product-copy">
            <h2>پیشنهادهای مکمل از دسته {complementaryCategory}</h2>
            <div className="products-grid products-grid-home">
              {complementaryProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

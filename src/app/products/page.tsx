import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog, getCategories } from "@/lib/products";
import { ProductsSection } from "@/components/ProductsSection";
import { PackagesSection } from "@/components/PackagesSection";
import { SiteNav } from "@/components/SiteNav";
import { QuietBanner } from "@/components/QuietBanner";
import { RevealObserver } from "@/components/RevealObserver";
import {
  breadcrumbJsonLd,
  categoryItemListJsonLd,
  shopFaqJsonLd,
} from "@/lib/seo";
import {
  categorySeo,
  sortCategoriesBySitePriority,
  CATEGORY_BLURBS,
} from "@/lib/catalog-taxonomy";
import { CONSULTANTS } from "@/lib/contact";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ cat?: string; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { cat, q } = await searchParams;
  const seo = categorySeo(cat || null);
  const title = seo?.h1
    ? seo.h1.replace(/\s*\|\s*/g, " | ").split("|")[0].trim()
    : q
      ? `جستجو ${q} در فروشگاه خانه هوشمند`
      : "فروشگاه خانه هوشمند | خرید تجهیزات هوشمندسازی ساختمان";
  const description =
    seo?.lead ||
    (q
      ? `نتایج جستجوی ${q} در کاتالوگ هومو — خرید خانه هوشمند، کلید هوشمند، پریز و تجهیزات هوشمندسازی.`
      : "خرید آنلاین تجهیزات خانه هوشمند و هوشمندسازی ساختمان: کلید هوشمند، پریز، قفل، هاب، آیفون تصویری، سیستم صوتی و پکیج آماده. لیست قیمت و مشاوره فروش هومو.");
  const canonical = cat
    ? `/products?cat=${encodeURIComponent(cat)}`
    : q
      ? `/products?q=${encodeURIComponent(q)}`
      : "/products";
  return {
    title,
    description,
    keywords: [
      "خانه هوشمند",
      "خرید خانه هوشمند",
      "هوشمندسازی ساختمان",
      "قیمت تجهیزات خانه هوشمند",
      "کلید هوشمند",
      "پریز هوشمند",
      "قفل هوشمند",
      "تاچ پنل",
      "پکیج خانه هوشمند",
      cat || "",
      "هومو",
      "لیست قیمت کلید هوشمند",
      "فروش تجهیزات خانه هوشمند",
    ].filter(Boolean),
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "fa_IR",
      siteName: "هومو",
    },
    alternates: { canonical },
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const { cat, q } = await searchParams;
  const catalog = await getCatalog();
  const categories = sortCategoriesBySitePriority(getCategories(catalog.products));
  const seo = categorySeo(cat || null);
  const h1 =
    seo?.h1 ||
    (cat
      ? `خرید ${cat} | فروشگاه خانه هوشمند هومو`
      : "فروشگاه خانه هوشمند | خرید تجهیزات هوشمندسازی ساختمان");
  const lead =
    seo?.lead ||
    `${catalog.meta.productCount.toLocaleString("fa-IR")} محصول در ${categories.length.toLocaleString("fa-IR")} دسته؛ انتخاب سریع تجهیزات و پکیج آماده خانه هوشمند.`;

  const schemas = [
    breadcrumbJsonLd([
      { name: "خانه", path: "/" },
      { name: "فروشگاه خانه هوشمند", path: "/products" },
      ...(cat ? [{ name: cat, path: `/products?cat=${encodeURIComponent(cat)}` }] : []),
    ]),
    categoryItemListJsonLd(categories.slice(0, 12)),
    ...(seo?.faqs && seo.faqs.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: seo.faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.answer,
              },
            })),
          },
        ]
      : [shopFaqJsonLd()]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: h1,
      description: lead,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://homo.ir"}/products`,
      isPartOf: { "@type": "WebSite", name: "هومو" },
      about: ["خانه هوشمند", "هوشمندسازی ساختمان", "تجهیزات هوشمندسازی"],
    },
  ];

  return (
    <main>
      <RevealObserver />
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <SiteNav />
      <div className="page-hero page-hero-quiet">
        <QuietBanner src="/banners/hero-banner.png" alt="فروشگاه خانه هوشمند هومو — خرید تجهیزات هوشمندسازی" />
        <p className="eyebrow">فروشگاه تخصصی خانه هوشمند</p>
        <h1>{h1}</h1>
        <p>{lead}</p>
      </div>

      <PackagesSection products={catalog.products} />
      <ProductsSection products={catalog.products} initialCategory={cat} initialQuery={q} />

      <section className="section seo-shop-copy reveal" aria-labelledby="seo-shop-heading">
        <h2 id="seo-shop-heading">
          {seo ? seo.h1.split("|")[0].trim() : "خرید تجهیزات خانه هوشمند از هومو"}
        </h2>
        <p>
          {seo?.body ||
            "فروشگاه خانه هوشمند هومو مرجع خرید تجهیزات هوشمندسازی ساختمان است: کلید هوشمند لمسی، پریز هوشمند، قفل و دستگیره، هاب و تاچ‌پنل، آیفون تصویری، سیستم صوتی، پرده برقی، سرمایش و گرمایش و پکیج آماده واحد و ویلا. قیمت تجهیزات خانه هوشمند به‌صورت شفاف در کاتالوگ آمده و قبل از خرید می‌توانید با مشاور فروش هماهنگ کنید."}
        </p>

        {seo?.guidePoints && seo.guidePoints.length > 0 && (
          <div className="mt-4 p-5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-neutral-800 dark:text-neutral-200">
            <h3 className="text-base font-bold text-amber-700 dark:text-amber-400 mb-2">
              نکات کلیدی انتخاب و خرید {cat || "تجهیزات هوشمندسازی"}:
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm leading-relaxed">
              {seo.guidePoints.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {seo?.faqs && seo.faqs.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              پرسش‌های متداول درباره {cat || "خانه هوشمند"}:
            </h3>
            {seo.faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-black/10 dark:border-white/10 p-3.5 bg-white/60 dark:bg-neutral-900/60 transition"
              >
                <summary className="font-semibold text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-amber-600 transition group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-black/5 dark:border-white/5 pt-2">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        )}

        <p className="mt-5">
          اگر به دنبال <strong>لیست قیمت کلید هوشمند</strong>،{" "}
          <strong>خرید پریز هوشمند</strong>، <strong>قفل دیجیتال</strong> یا{" "}
          <strong>پکیج خانه هوشمند</strong> هستید، از دسته‌بندی‌های بالا وارد شوید. هومو برای سازنده،
          کارفرما و واحد مسکونی مسیر مشخص از انتخاب تا مشاوره نصب ارائه می‌دهد.
        </p>
        <ul className="seo-shop-cats">
          {categories.slice(0, 8).map((c) => (
            <li key={c.name}>
              <Link href={`/products?cat=${encodeURIComponent(c.name)}`}>
                {c.name}
                {CATEGORY_BLURBS[c.name] ? ` — ${CATEGORY_BLURBS[c.name]}` : ""} (
                {c.count.toLocaleString("fa-IR")} کالا)
              </Link>
            </li>
          ))}
        </ul>
        <p className="seo-shop-contact">
          مشاوره خرید خانه هوشمند:{" "}
          {CONSULTANTS.map((c, i) => (
            <span key={c.phone}>
              {i > 0 ? " · " : ""}
              {c.name} {c.phone}
            </span>
          ))}
        </p>
      </section>

      <p className="catalog-back">
        <Link href="/">← بازگشت به صفحه اصلی هوشمندسازی هومو</Link>
      </p>
    </main>
  );
}

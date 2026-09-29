import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/products";
import { getPublishedGuides } from "@/lib/guides";
import { SiteNav } from "@/components/SiteNav";
import { HeroIntro } from "@/components/HeroIntro";
import { CategoriesSection } from "@/components/CategoriesSection";
import { HomeShowcase } from "@/components/HomeShowcase";
import { BestSellingSwitches } from "@/components/BestSellingSwitches";
import { QuoteEstimator } from "@/components/QuoteEstimator";
import { GuidesSection } from "@/components/GuidesSection";
import { BuyProcess } from "@/components/BuyProcess";
import { HomeShopMotion } from "@/components/HomeShopMotion";
import { getCategories } from "@/lib/products-client";
import { sortCategoriesBySitePriority } from "@/lib/catalog-taxonomy";
import {
  websiteJsonLd,
  organizationJsonLd,
  homeFaqJsonLd,
  categoryItemListJsonLd,
  localBusinessJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { CONSULTANTS } from "@/lib/contact";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هومو | هوشمندسازی خانه، ویلا و پروژه سازنده",
  description:
    "هوشمندسازی ساختمان با هومو: کلید هوشمند، پریز، لوازم ساختمانی، قفل، هاب، سیستم صوتی و پکیج آماده. مشاوره فروش برای سازنده، واحد و ویلا.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "هومو | هوشمندسازی ساختمان و خانه هوشمند",
    description:
      "کاتالوگ واقعی هوشمندسازی + پکیج سازنده + مشاوره اجرا. کلید، پریز، لوازم ساختمانی، قفل، هاب و بیشتر.",
    url: "/",
    type: "website",
    locale: "fa_IR",
  },
};

export default async function Home() {
  const catalog = await getCatalog();
  const guides = await getPublishedGuides();
  const { products } = catalog;
  const categories = sortCategoriesBySitePriority(getCategories(products))
    .slice(0, 10)
    .map((c) => ({ name: c.name, count: c.count }));

  const schemas = [
    websiteJsonLd(),
    organizationJsonLd(CONSULTANTS.map((c) => c.phone)),
    localBusinessJsonLd(),
    homeFaqJsonLd(),
    categoryItemListJsonLd(categories),
    breadcrumbJsonLd([
      { name: "خانه", path: "/" },
      { name: "فروشگاه هوشمندسازی", path: "/products" },
    ]),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <SiteNav />
      <HomeShopMotion products={products} />
      <div className="home-shell">
        <HeroIntro />
        <CategoriesSection products={products} />
        <HomeShowcase products={products} />
        <BestSellingSwitches products={products} />
        <GuidesSection guides={guides} />
        <QuoteEstimator products={products} />
        <BuyProcess />
        <section className="section section-tight home-seo-block" aria-label="درباره هوشمندسازی هومو">
          <h2>هوشمندسازی ساختمان با هومو</h2>
          <p>
            هومو روی هوشمندسازی واحد، ویلا و پروژه‌های سازنده تمرکز دارد: از انتخاب کلید و پریز
            هوشمند تا هاب مرکزی، قفل، پرده برقی و آیفون تصویری. هدف ما مسیر شفاف برای خرید و اجراست
            تا کارفرما و سازنده بدون پیچیدگی اضافه، خانه هوشمند واقعی دریافت کنند.
          </p>
          <p>
            برای مشاوره فروش با {CONSULTANTS.map((c) => c.name).join(" و ")} در تماس باشید یا از{" "}
            <Link href="/products">فروشگاه هوشمندسازی</Link> و{" "}
            <Link href="/guides">راهنماهای آموزشی</Link> شروع کنید.
          </p>
        </section>
      </div>
    </>
  );
}

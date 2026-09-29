import Link from "next/link";
import type { Metadata } from "next";
import { getGuides } from "@/lib/guides";
import { SiteNav } from "@/components/SiteNav";
import { QuietBanner } from "@/components/QuietBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آموزش هوشمندسازی",
  description:
    "راهنمای هوشمندسازی واحد و ویلا: انتخاب قطعه، سیم‌کشی، Zigbee و وای‌فای برای سازنده و کارفرما.",
  alternates: { canonical: "/guides" },
};

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <main>
      <SiteNav />
      <div className="page-hero page-hero-quiet">
        <QuietBanner src="/banners/banner-lifestyle.png" alt="آموزش هوشمندسازی خانه — هومو" />
        <p className="eyebrow">دانشنامه هوشمندسازی</p>
        <h1>آموزش‌ها</h1>
        <p>راهنمای کوتاه انتخاب قطعه و اجرای هوشمندسازی</p>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="guides-grid">
          {guides.map((g) => (
            <Link key={g.id} href={`/guides/${g.id}`} className="guide-card">
              <span>{g.category}</span>
              <h3>{g.title}</h3>
              <p>{g.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

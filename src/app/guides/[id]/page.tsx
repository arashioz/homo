import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide, getGuides } from "@/lib/guides";
import { SiteNav } from "@/components/SiteNav";
import { breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const guide = await getGuide(id);
  if (!guide) return { title: "آموزش | هومو" };
  return {
    title: guide.title,
    description: guide.excerpt,
    openGraph: { title: guide.title, description: guide.excerpt, type: "article" },
    alternates: { canonical: `/guides/${guide.id}` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { id } = await params;
  const [guide, all] = await Promise.all([getGuide(id), getGuides()]);
  if (!guide) notFound();
  const others = all.filter((g) => g.id !== guide.id);

  return (
    <main>
      <SiteNav />
      <article className="guide-article">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: guide.title,
                description: guide.excerpt,
                inLanguage: "fa-IR",
                author: { "@type": "Organization", name: "هومو" },
              },
              breadcrumbJsonLd([
                { name: "خانه", path: "/" },
                { name: "آموزش‌ها", path: "/guides" },
                { name: guide.title, path: `/guides/${guide.id}` },
              ]),
            ]),
          }}
        />
        <Link href="/#guides" className="back-link">
          ← آموزش‌ها
        </Link>
        <span className="product-id">{guide.category}</span>
        <h1>{guide.title}</h1>
        {guide.body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </article>
      {others.length > 0 && (
        <section className="section">
          <h2>دیگر آموزش‌ها</h2>
          <div className="guides-grid">
            {others.map((g) => (
              <Link key={g.id} href={`/guides/${g.id}`} className="guide-card">
                <span>{g.category}</span>
                <h3>{g.title}</h3>
                <p>{g.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

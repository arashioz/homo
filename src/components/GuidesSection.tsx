import Link from "next/link";
import type { Guide } from "@/lib/guides";

export function GuidesSection({ guides }: { guides: Guide[] }) {
  const topGuides = guides.slice(0, 4);

  return (
    <section id="blog" className="section section-tight blog-section" aria-labelledby="blog-heading">
      <div className="section-head reveal">
        <div>
          <span className="text-xs font-bold tracking-wider text-amber-600 uppercase mb-1 block">
            دانشنامه و وبلاگ هومو
          </span>
          <h2 id="blog-heading" className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f]">
            مقالات و راهنمای هوشمندسازی ساختمان
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mt-1.5">
            بررسی تخصصی پروتکل‌های Zigbee و Wi-Fi، نقشه‌های سیم‌کشی استاندارد، راهنمای خرید کلید لمسی و سناریوهای کاربردی خانه هوشمند.
          </p>
        </div>
        <Link
          href="/guides"
          className="inline-flex items-center gap-1.5 rounded-full bg-black/5 hover:bg-black/10 px-4 py-2 text-xs sm:text-sm font-bold text-[#1d1d1f] transition"
        >
          <span>مشاهده همه مقالات وبلاگ</span>
          <span aria-hidden>←</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {topGuides.map((g) => (
          <article
            key={g.id}
            className="group relative flex flex-col justify-between rounded-3xl border border-black/5 bg-white/70 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-3">
                <span className="rounded-full bg-amber-500/10 text-amber-700 px-2.5 py-1 text-[0.75rem]">
                  {g.category || "مقاله تخصصی"}
                </span>
                <span className="flex items-center gap-1 text-[0.75rem]">
                  <span>⏱</span>
                  {g.readMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
                </span>
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] leading-snug group-hover:text-amber-700 transition">
                <Link href={`/guides/${g.id}`} className="focus:outline-none">
                  <span className="absolute inset-0" aria-hidden="true" />
                  {g.title}
                </Link>
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-neutral-600 line-clamp-3 leading-relaxed">
                {g.excerpt}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>مطالعه کامل راهنما</span>
              <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/guides"
          className="inline-block text-xs sm:text-sm text-neutral-500 hover:text-neutral-900 underline underline-offset-4 transition"
        >
          نیاز به آموزش خاصی دارید؟ آرشیو کامل راهنماهای فنی هومو را ببینید
        </Link>
      </div>
    </section>
  );
}

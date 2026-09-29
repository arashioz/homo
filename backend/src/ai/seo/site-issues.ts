import type { PageAnalysis } from "./page-analyzer";
import { normalizeSitePath } from "./page-analyzer";
import type { SeoIssueDraft } from "./seo-score";

export interface SiteCrawlContext {
  siteUrl: string;
  robotsTxt: string | null;
  sitemapUrls: string[];
  sitemapFetched: boolean;
  brokenLinks: Array<{ url: string; status: number }>;
  brokenImages: Array<{ url: string; status: number }>;
}

function pushSite(issues: SeoIssueDraft[], issue: SeoIssueDraft) {
  issues.push(issue);
}

export function expectedSchemaFor(url: string): string[] {
  if (/\/products\/[^/]+$/.test(url)) return ["Product"];
  if (/\/guides\/[^/]+$/.test(url)) return ["Article"];
  if (/\/guides\/?$/.test(url) || /\/products\/?$/.test(url)) return ["ItemList", "CollectionPage", "WebPage"];
  return ["Organization", "WebSite", "WebPage"];
}

export function issuesFromSite(pages: PageAnalysis[], crawl: SiteCrawlContext): SeoIssueDraft[] {
  const issues: SeoIssueDraft[] = [];
  const site = crawl.siteUrl.replace(/\/$/, "");

  if (crawl.robotsTxt == null) {
    pushSite(issues, {
      url: `${site}/robots.txt`,
      type: "missing_robots",
      severity: "HIGH",
      title: "robots.txt در دسترس نیست",
      explanation: "فایل robots.txt واکشی نشد.",
      whyItMatters: "خزنده‌ها بدون robots مسیر ایندکس و sitemap را درست نمی‌فهمند.",
      recommendation: "robots.txt را با Allow عمومی و Disallow برای /admin و /api منتشر کنید.",
      autoFixAvailable: false,
    });
  } else {
    if (!/sitemap:/i.test(crawl.robotsTxt)) {
      pushSite(issues, {
        url: `${site}/robots.txt`,
        type: "robots_missing_sitemap",
        severity: "MEDIUM",
        title: "robots.txt به sitemap اشاره نمی‌کند",
        explanation: "دستور Sitemap در robots.txt پیدا نشد.",
        whyItMatters: "گوگل sitemap را سریع‌تر از طریق robots کشف می‌کند.",
        recommendation: "خط Sitemap: را به آدرس sitemap.xml اضافه کنید.",
        autoFixAvailable: true,
      });
    }
    if (/^\s*disallow:\s*\/\s*$/im.test(crawl.robotsTxt) && !/^\s*allow:\s*\//im.test(crawl.robotsTxt)) {
      pushSite(issues, {
        url: `${site}/robots.txt`,
        type: "robots_blocks_site",
        severity: "CRITICAL",
        title: "robots کل سایت را بسته است",
        explanation: "Disallow: / بدون Allow عمومی پیدا شد.",
        whyItMatters: "سایت از ایندکس خارج می‌شود.",
        recommendation: "Disallow را فقط برای مسیرهای خصوصی نگه دارید.",
        autoFixAvailable: false,
      });
    }
  }

  if (!crawl.sitemapFetched) {
    pushSite(issues, {
      url: `${site}/sitemap.xml`,
      type: "missing_sitemap",
      severity: "HIGH",
      title: "sitemap.xml پیدا نشد",
      explanation: "واکشی sitemap ناموفق بود.",
      whyItMatters: "بدون sitemap صفحات عمیق دیرتر کشف می‌شوند.",
      recommendation: "sitemap.xml را از مسیرهای عمومی سایت بسازید.",
      autoFixAvailable: false,
    });
  }

  const pointedTo = new Set<string>();
  for (const page of pages) {
    for (const href of page.internalLinks) {
      try {
        pointedTo.add(normalizeSitePath(new URL(href, page.url).toString()));
      } catch {
        /* ignore invalid href */
      }
    }
  }
  for (const page of pages) {
    const path = normalizeSitePath(page.url);
    const isHome = path === normalizeSitePath(site);
    if (!isHome && !pointedTo.has(path) && page.fetchStatus < 400) {
      pushSite(issues, {
        url: page.url,
        type: "orphan_page",
        severity: "MEDIUM",
        title: "صفحه orphan است",
        explanation: "در صفحات تحلیل‌شده لینک داخلی به این URL پیدا نشد.",
        whyItMatters: "صفحه بدون لینک داخلی سخت خزیده و رتبه‌بندی می‌شود.",
        recommendation: "از خانه، دسته‌بندی یا مقالات مرتبط به این صفحه لینک بدهید.",
        autoFixAvailable: false,
      });
    }
  }

  const byPath = new Map<string, PageAnalysis[]>();
  for (const page of pages) {
    const key = normalizeSitePath(page.url);
    byPath.set(key, [...(byPath.get(key) ?? []), page]);
  }
  for (const group of byPath.values()) {
    const variants = new Set(group.map((page) => page.url));
    if (variants.size > 1) {
      for (const page of group) {
        pushSite(issues, {
          url: page.url,
          type: "duplicate_url",
          severity: "MEDIUM",
          title: "URL تکراری با/بدون اسلش یا پارامتر",
          explanation: "چند آدرس به یک مسیر نرمال‌شده می‌رسند.",
          whyItMatters: "نسخه‌های تکراری URL قدرت سئو را تقسیم می‌کنند.",
          recommendation: "یک نسخه را canonical کنید و بقیه را ریدایرکت ۳۰۱ بدهید.",
          autoFixAvailable: false,
        });
      }
    }
  }

  const fingerprints = new Map<string, PageAnalysis[]>();
  for (const page of pages) {
    if (page.contentFingerprint.length < 80) continue;
    fingerprints.set(page.contentFingerprint, [...(fingerprints.get(page.contentFingerprint) ?? []), page]);
  }
  for (const group of fingerprints.values()) {
    if (group.length < 2) continue;
    for (const page of group) {
      pushSite(issues, {
        url: page.url,
        type: "duplicate_content",
        severity: "HIGH",
        title: "محتوای تکراری بین صفحات",
        explanation: `${group.length} صفحه متن بسیار مشابه دارند.`,
        whyItMatters: "محتوای تکراری سیگنال رتبه را ضعیف می‌کند.",
        recommendation: "محتوا را یکتا کنید یا canonical را به نسخه اصلی بدهید.",
        autoFixAvailable: false,
      });
    }
  }

  for (const page of pages) {
    if (page.internalLinks.length > 250) {
      pushSite(issues, {
        url: page.url,
        type: "excessive_internal_links",
        severity: "LOW",
        title: "لینک داخلی بیش از حد",
        explanation: `${page.internalLinks.length} لینک داخلی در صفحه است.`,
        whyItMatters: "صفحه شلوغ ارزش لینک را رقیق می‌کند.",
        recommendation: "لینک‌ها را به بخش‌های مرتبط محدود کنید.",
        autoFixAvailable: false,
      });
    }
    const needed = expectedSchemaFor(page.url);
    const hasExpected = needed.some((type) => page.jsonLdTypes.includes(type));
    if (page.hasJsonLd && !hasExpected && page.fetchStatus < 400) {
      pushSite(issues, {
        url: page.url,
        type: "wrong_schema",
        severity: "LOW",
        title: "نوع Schema با صفحه هم‌خوان نیست",
        explanation: `انواع موجود: ${page.jsonLdTypes.join(", ") || "—"} · انتظار: ${needed.join(" یا ")}`,
        whyItMatters: "اسکیمای نامربوط به نتایج غنی کمک نمی‌کند.",
        recommendation: `Schema مناسب این صفحه را اضافه کنید (${needed.join(" / ")}).`,
        autoFixAvailable: true,
      });
    }
  }

  for (const link of crawl.brokenLinks) {
    pushSite(issues, {
      url: link.url,
      type: "broken_link",
      severity: link.status === 0 ? "HIGH" : "CRITICAL",
      title: "لینک داخلی شکسته",
      explanation: `وضعیت HTTP: ${link.status || "بدون پاسخ"}`,
      whyItMatters: "لینک خراب تجربه کاربری و خزش را خراب می‌کند.",
      recommendation: "لینک را اصلاح یا حذف کنید.",
      autoFixAvailable: false,
    });
  }
  for (const image of crawl.brokenImages) {
    pushSite(issues, {
      url: image.url,
      type: "broken_image",
      severity: "MEDIUM",
      title: "تصویر شکسته",
      explanation: `واکشی تصویر با وضعیت ${image.status || "بدون پاسخ"} شکست خورد.`,
      whyItMatters: "تصویر خراب صفحه را ناقص نشان می‌دهد.",
      recommendation: "مسیر فایل را در public یا CDN درست کنید.",
      autoFixAvailable: false,
    });
  }

  if (crawl.sitemapFetched && crawl.sitemapUrls.length) {
    const listed = new Set(crawl.sitemapUrls.map(normalizeSitePath));
    for (const page of pages) {
      if (page.noindex || page.fetchStatus >= 400) continue;
      if (!listed.has(normalizeSitePath(page.url)) && !/checkout/.test(page.url)) {
        pushSite(issues, {
          url: page.url,
          type: "not_in_sitemap",
          severity: "LOW",
          title: "صفحه در sitemap نیست",
          explanation: "این URL در sitemap.xml دیده نشد.",
          whyItMatters: "صفحات ایندکس‌پذیر بهتر است در sitemap باشند.",
          recommendation: "مسیر را به sitemap اضافه کنید.",
          autoFixAvailable: true,
        });
      }
    }
  }

  return issues;
}

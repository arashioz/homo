import type { PageAnalysis } from "./page-analyzer";
import { normalizeSitePath } from "./page-analyzer";
import type { SeoSeverity } from "../ai.schemas";

export interface SeoIssueDraft {
  url: string;
  type: string;
  severity: SeoSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendation: string;
  autoFixAvailable: boolean;
}

export interface ScoreBreakdown {
  technical: number;
  content: number;
  onPage: number;
  internalLinking: number;
  structuredData: number;
  indexability: number;
  performance: number;
  overall: number;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function persianish(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

export function issuesFromPage(page: PageAnalysis): SeoIssueDraft[] {
  const issues: SeoIssueDraft[] = [];
  const push = (issue: Omit<SeoIssueDraft, "url">) => issues.push({ url: page.url, ...issue });

  if (page.fetchStatus >= 400) {
    push({
      type: "broken_page",
      severity: "CRITICAL",
      title: "صفحه در دسترس خزنده‌ها نیست",
      explanation: `واکشی صفحه با وضعیت ${page.fetchStatus} شکست خورد.`,
      whyItMatters: "صفحه خراب ایندکس نمی‌شود و بودجه خزش را هدر می‌دهد.",
      recommendation: "مسیر، ریدایرکت و وضعیت HTTP را اصلاح کنید.",
      autoFixAvailable: false,
    });
    return issues;
  }
  if (!page.title) {
    push({
      type: "missing_title",
      severity: "CRITICAL",
      title: "Title وجود ندارد",
      explanation: "تگ title در HTML پیدا نشد.",
      whyItMatters: "عنوان اولین سیگنال جستجو و نمایش در SERP است.",
      recommendation: "یک عنوان فارسی یکتا بین ۳۰ تا ۶۰ کاراکتر بگذارید.",
      autoFixAvailable: true,
    });
  } else if (page.title.length < 20) {
    push({
      type: "short_title",
      severity: "MEDIUM",
      title: "Title خیلی کوتاه است",
      explanation: `طول عنوان ${page.title.length} کاراکتر است.`,
      whyItMatters: "عنوان کوتاه معمولاً نیت جستجو را پوشش نمی‌دهد.",
      recommendation: "عنوان را با کلیدواژه اصلی و برند هومو کامل کنید.",
      autoFixAvailable: true,
    });
  } else if (page.title.length > 70) {
    push({
      type: "long_title",
      severity: "LOW",
      title: "Title طولانی است",
      explanation: `طول عنوان ${page.title.length} کاراکتر است و در نتایج بریده می‌شود.`,
      whyItMatters: "عنوان بریده‌شده نرخ کلیک را کم می‌کند.",
      recommendation: "عنوان را به حدود ۶۰ کاراکتر برسانید.",
      autoFixAvailable: true,
    });
  }
  if (!persianish(page.title) && page.title) {
    push({
      type: "non_persian_title",
      severity: "MEDIUM",
      title: "Title فارسی نیست",
      explanation: "عنوان صفحه کاراکتر فارسی ندارد.",
      whyItMatters: "سایت فارسی باید برای جستجوی فارسی بهینه‌سازی شود.",
      recommendation: "عنوان را به فارسی طبیعی بازنویسی کنید.",
      autoFixAvailable: true,
    });
  }
  if (!page.metaDescription) {
    push({
      type: "missing_meta_description",
      severity: "HIGH",
      title: "Meta Description وجود ندارد",
      explanation: "تگ description پیدا نشد.",
      whyItMatters: "توضیح متا روی نرخ کلیک نتایج جستجو اثر مستقیم دارد.",
      recommendation: "توضیح ۷۰ تا ۱۶۰ کاراکتری فارسی بنویسید.",
      autoFixAvailable: true,
    });
  } else if (page.metaDescription.length < 50 || page.metaDescription.length > 170) {
    push({
      type: "weak_meta_description",
      severity: "MEDIUM",
      title: "Meta Description نامناسب است",
      explanation: `طول توضیح ${page.metaDescription.length} کاراکتر است.`,
      whyItMatters: "توضیح خیلی کوتاه یا خیلی بلند در SERP خوب دیده نمی‌شود.",
      recommendation: "توضیح را بین ۷۰ تا ۱۶۰ کاراکتر نگه دارید.",
      autoFixAvailable: true,
    });
  }
  if (!page.canonical) {
    push({
      type: "missing_canonical",
      severity: "HIGH",
      title: "Canonical وجود ندارد",
      explanation: "link rel=canonical پیدا نشد.",
      whyItMatters: "بدون canonical خطر محتوای تکراری بیشتر می‌شود.",
      recommendation: "canonical مطلق همان URL صفحه را بگذارید.",
      autoFixAvailable: true,
    });
  } else {
    try {
      const canonicalUrl = new URL(page.canonical, page.url).toString();
      if (normalizeSitePath(canonicalUrl) !== normalizeSitePath(page.url)) {
        push({
          type: "canonical_mismatch",
          severity: "MEDIUM",
          title: "Canonical به صفحه دیگری اشاره می‌کند",
          explanation: `canonical فعلی: ${page.canonical}`,
          whyItMatters: "canonical اشتباه اعتبار ایندکس را به URL دیگری می‌دهد.",
          recommendation: "canonical را روی نسخه اصلی همین صفحه تنظیم کنید.",
          autoFixAvailable: true,
        });
      }
    } catch {
      push({
        type: "invalid_canonical",
        severity: "MEDIUM",
        title: "Canonical نامعتبر است",
        explanation: `مقدار canonical قابل تجزیه نیست: ${page.canonical}`,
        whyItMatters: "canonical خراب نادیده گرفته می‌شود.",
        recommendation: "یک URL مطلق معتبر بگذارید.",
        autoFixAvailable: true,
      });
    }
  }
  if (page.titleCount > 1) {
    push({
      type: "multiple_title",
      severity: "MEDIUM",
      title: "چند تگ Title در صفحه است",
      explanation: `${page.titleCount} تگ title پیدا شد.`,
      whyItMatters: "خزنده‌ها ممکن است عنوان اشتباه را انتخاب کنند.",
      recommendation: "فقط یک title نگه دارید.",
      autoFixAvailable: false,
    });
  }
  if (page.headingSkipped) {
    push({
      type: "skipped_heading",
      severity: "LOW",
      title: "سلسله‌مراتب تیتر پرش دارد",
      explanation: "سطح تیتر بیش از یک پله جهش کرده است (مثلاً H1 به H3).",
      whyItMatters: "ساختار محتوا برای دسترسی‌پذیری و درک موضوع ضعیف می‌شود.",
      recommendation: "تیترها را به‌ترتیب H1 سپس H2 سپس H3 بچینید.",
      autoFixAvailable: false,
    });
  }
  if (!page.lang) {
    push({
      type: "missing_lang",
      severity: "MEDIUM",
      title: "lang صفحه مشخص نیست",
      explanation: "ویژگی lang روی html پیدا نشد.",
      whyItMatters: "زبان سند برای ایندکس فارسی و دسترس‌پذیری لازم است.",
      recommendation: "html lang=\"fa\" بگذارید.",
      autoFixAvailable: true,
    });
  } else if (!/^fa/i.test(page.lang)) {
    push({
      type: "non_persian_lang",
      severity: "LOW",
      title: "زبان سند فارسی نیست",
      explanation: `lang فعلی: ${page.lang}`,
      whyItMatters: "سایت فارسی باید با lang فارسی علامت‌گذاری شود.",
      recommendation: "مقدار lang را fa یا fa-IR کنید.",
      autoFixAvailable: true,
    });
  }
  if (!page.hasViewport) {
    push({
      type: "missing_viewport",
      severity: "LOW",
      title: "viewport موبایل نیست",
      explanation: "متا viewport پیدا نشد.",
      whyItMatters: "بدون viewport صفحه در موبایل درست ایندکس و نمایش داده نمی‌شود.",
      recommendation: "متا viewport استاندارد را اضافه کنید.",
      autoFixAvailable: true,
    });
  }
  if (page.urlLength > 115) {
    push({
      type: "long_url",
      severity: "LOW",
      title: "URL بیش از حد طولانی است",
      explanation: `طول آدرس ${page.urlLength} کاراکتر است.`,
      whyItMatters: "URL بلند ضعیف‌تر به اشتراک و خزش می‌آید.",
      recommendation: "مسیر را کوتاه و خوانا کنید.",
      autoFixAvailable: false,
    });
  }
  if (page.h1.length === 0) {
    push({
      type: "missing_h1",
      severity: "HIGH",
      title: "H1 وجود ندارد",
      explanation: "صفحه تیتر H1 ندارد.",
      whyItMatters: "H1 موضوع اصلی صفحه را برای کاربر و موتور جستجو مشخص می‌کند.",
      recommendation: "یک H1 فارسی یکتا هم‌راستا با Title بگذارید.",
      autoFixAvailable: true,
    });
  } else if (page.h1.length > 1) {
    push({
      type: "multiple_h1",
      severity: "MEDIUM",
      title: "چند H1 در صفحه است",
      explanation: `${page.h1.length} تگ H1 پیدا شد.`,
      whyItMatters: "چند H1 سلسله‌مراتب تیتر را مبهم می‌کند.",
      recommendation: "فقط یک H1 نگه دارید و بقیه را H2/H3 کنید.",
      autoFixAvailable: false,
    });
  }
  if (page.wordCount < 80 && !/\/products\/\d+/.test(page.url)) {
    push({
      type: "thin_content",
      severity: "MEDIUM",
      title: "محتوای صفحه ناکافی است",
      explanation: `حدود ${page.wordCount} واژه ایندکس‌پذیر پیدا شد.`,
      whyItMatters: "صفحه نازک معمولاً رتبه نمی‌گیرد.",
      recommendation: "توضیح، FAQ یا راهنمای مرتبط اضافه کنید.",
      autoFixAvailable: false,
    });
  }
  if (page.missingAltCount > 0) {
    push({
      type: "missing_alt",
      severity: page.missingAltCount > 5 ? "HIGH" : "LOW",
      title: "تصویر بدون Alt وجود دارد",
      explanation: `${page.missingAltCount} تصویر alt ندارد.`,
      whyItMatters: "Alt هم دسترسی‌پذیری است و هم سیگنال تصویر در جستجو.",
      recommendation: "برای هر تصویر alt فارسی توصیفی بگذارید.",
      autoFixAvailable: true,
    });
  }
  if (!page.hasOpenGraph) {
    push({
      type: "missing_open_graph",
      severity: "LOW",
      title: "Open Graph ناقص است",
      explanation: "متادیتای og: پیدا نشد.",
      whyItMatters: "اشتراک در شبکه‌های اجتماعی بدون تصویر و عنوان درست ضعیف می‌شود.",
      recommendation: "og:title، og:description و og:image را اضافه کنید.",
      autoFixAvailable: true,
    });
  } else if (!page.ogImage) {
    push({
      type: "missing_og_image",
      severity: "LOW",
      title: "og:image وجود ندارد",
      explanation: "Open Graph هست ولی تصویر اشتراک نیست.",
      whyItMatters: "لینک بدون تصویر در شبکه‌های اجتماعی ضعیف دیده می‌شود.",
      recommendation: "یک تصویر مطلق og:image اضافه کنید.",
      autoFixAvailable: true,
    });
  }
  if (!page.hasTwitterCard) {
    push({
      type: "missing_twitter_card",
      severity: "LOW",
      title: "Twitter Card نیست",
      explanation: "متادیتای twitter: پیدا نشد.",
      whyItMatters: "پیش‌نمایش لینک در X/Twitter ناقص می‌ماند.",
      recommendation: "twitter:card و twitter:title را اضافه کنید.",
      autoFixAvailable: true,
    });
  }
  if (!page.hasJsonLd) {
    push({
      type: "missing_schema",
      severity: "MEDIUM",
      title: "Structured Data وجود ندارد",
      explanation: "JSON-LD در صفحه نیست.",
      whyItMatters: "اسکیما به نتایج غنی و درک موجودیت برند کمک می‌کند.",
      recommendation: "Organization، Product یا Article Schema متناسب با نوع صفحه اضافه کنید.",
      autoFixAvailable: true,
    });
  }
  if (page.internalLinks.length < 2) {
    push({
      type: "weak_internal_links",
      severity: "MEDIUM",
      title: "لینک داخلی ضعیف است",
      explanation: `فقط ${page.internalLinks.length} لینک داخلی پیدا شد.`,
      whyItMatters: "صفحات بدون لینک داخلی سخت کشف می‌شوند.",
      recommendation: "به محصولات، راهنماها یا صفحه خدمات مرتبط لینک بدهید.",
      autoFixAvailable: false,
    });
  }
  if (page.noindex && !/checkout\/done|admin|api/.test(page.url)) {
    push({
      type: "unexpected_noindex",
      severity: "HIGH",
      title: "noindex غیرضروری",
      explanation: "صفحه عمومی noindex شده است.",
      whyItMatters: "صفحه از ایندکس خارج می‌شود.",
      recommendation: "اگر صفحه باید در گوگل باشد، robots را index,follow کنید.",
      autoFixAvailable: true,
    });
  }
  return issues;
}

export function scoreFromIssues(pages: PageAnalysis[], issues: SeoIssueDraft[]): ScoreBreakdown {
  const deduct = (types: string[], weight: number) => {
    const points = issues
      .filter((issue) => types.includes(issue.type))
      .reduce((sum, issue) => {
        const factor =
          issue.severity === "CRITICAL" ? 1 : issue.severity === "HIGH" ? 0.7 : issue.severity === "MEDIUM" ? 0.45 : 0.15;
        return sum + factor * weight;
      }, 0);
    return clamp(100 - points);
  };
  const technical = deduct(
    ["missing_title", "missing_canonical", "broken_page", "long_title", "short_title", "missing_robots", "missing_sitemap", "robots_blocks_site", "missing_viewport", "invalid_canonical"],
    12,
  );
  const onPage = deduct(
    ["missing_h1", "multiple_h1", "missing_meta_description", "weak_meta_description", "non_persian_title", "skipped_heading", "canonical_mismatch", "missing_lang", "multiple_title"],
    10,
  );
  const content = deduct(["thin_content", "duplicate_content", "duplicate_title", "duplicate_meta_description"], 18);
  const internalLinking = deduct(["weak_internal_links", "orphan_page", "broken_link", "excessive_internal_links"], 20);
  const structuredData = deduct(["missing_schema", "missing_open_graph", "wrong_schema", "missing_og_image", "missing_twitter_card"], 14);
  const indexability = deduct(["unexpected_noindex", "broken_page", "robots_blocks_site", "not_in_sitemap", "duplicate_url"], 25);
  const performance = pages.length
    ? clamp(100 - pages.filter((page) => page.fetchStatus >= 400 || page.fetchStatus === 0).length * 20)
    : 0;
  const overall = clamp(
    technical * 0.2 +
      onPage * 0.2 +
      content * 0.15 +
      internalLinking * 0.15 +
      structuredData * 0.1 +
      indexability * 0.15 +
      performance * 0.05,
  );
  return { technical, content, onPage, internalLinking, structuredData, indexability, performance, overall };
}

export function countBySeverity(issues: SeoIssueDraft[]) {
  return {
    critical: issues.filter((issue) => issue.severity === "CRITICAL").length,
    high: issues.filter((issue) => issue.severity === "HIGH").length,
    medium: issues.filter((issue) => issue.severity === "MEDIUM").length,
    low: issues.filter((issue) => issue.severity === "LOW").length,
    info: issues.filter((issue) => issue.severity === "INFO").length,
  };
}

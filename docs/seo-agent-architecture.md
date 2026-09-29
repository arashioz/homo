# معماری SEO Agent — Phase 1 و 2

**تاریخ:** ۲۹ سپتامبر ۲۰۲۶

## معماری فعلی مرتبط

| لایه | وضعیت |
| --- | --- |
| وب‌سایت عمومی | Next.js App Router در ریشه؛ صفحات `/`، `/products`، `/products/[id]`، `/guides`، `/guides/[id]`، `/checkout` |
| SEO فعلی سایت | `src/lib/seo.ts` (title/template، OG، Twitter، robots، canonical، JSON-LD Organization/Product/FAQ/Breadcrumb)، `src/app/sitemap.ts`، `src/app/robots.ts` |
| CMS | راهنماها در `data/guides.json`؛ محصول سایت در Mongo `site_products` و JSON کاتالوگ |
| ادمین کسب‌وکار | CRM Ionic در `apps/crm-frontend` (پنل Next `/admin` دیگر نقطهٔ عملیاتی نیست) |
| API | NestJS `backend/` با JWT و permission (`*` برای SUPER_ADMIN) |
| مقاله بلاگ قابل ویرایش در DB | مدل `ContentArticle` آماده است و هنوز UI تولید مقاله ندارد |

Agent روی **NestJS + CRM Admin** سوار است تا معماری موازی ساخته نشود.

## پیشنهاد معماری Agent

```
CRM Admin (Ionic)
  → REST /v1/ai/*
    → AiOrchestrator
      → Technical SEO Agent (ممیزی واقعی HTML / robots / sitemap / لینک)
      → Content Agent / Article Agent / Keyword Agent (فازهای بعد)
    → AiProvider factory (none | openai | ollama)
    → Mongo: SeoAudit, SeoIssue, SeoPageSnapshot, AiPrompt, AiAgentRun, AiAction, ContentArticle
```

تغییرات مخرب روی سایت بدون تأیید ادمین اعمال نمی‌شود. Chat اگر مدل پیکربندی نشده باشد دادهٔ جعلی نمی‌سازد. رتبه، حجم جستجو و بک‌لینک اختراع نمی‌شود.

## Phase 1 پیاده‌شده

- Provider abstraction
- ممیزی فنی واقعی با واکشی HTML / sitemap
- Score چندبخشی و تاریخچهٔ audit
- تحلیل یک URL
- Promptهای قابل مدیریت
- Chat مبتنی بر دادهٔ ممیزی
- صفحه CRM: سئو و AI

## Phase 2 پیاده‌شده

موتور ممیزی کامل‌تر:

- robots.txt (نبود فایل، Disallow کل سایت، نبود Sitemap)
- sitemap.xml و صفحات خارج از sitemap
- لینک شکسته و تصویر شکسته با probe محدود HEAD/GET
- صفحه orphan، URL تکراری، محتوای تکراری
- سلسله‌مراتب تیتر، lang، viewport، canonical mismatch
- Open Graph / Twitter / نوع Schema متناسب با مسیر
- داشبورد: تاریخچه، ضعیف‌ترین صفحات، فیلتر مسائل، لیست صفحات
- API: `GET /ai/seo/pages`، فیلتر `GET /ai/seo/issues`، `PATCH /ai/seo/issues/:id`
- ابزارهای orchestrator: `get_pages`، `get_issues`، `find_missing_alt`، `find_broken_links`، `find_orphans`

اعمال auto-fix هنوز نیاز به تأیید ادمین دارد و در این فاز فعال نشده است.

## فازهای باقی

3 تا 10 طبق درخواست: Content Studio، Editor، Internal Linking، Content Gap، Calendar، Keywords، تست کامل permission و auto-fix با approval.

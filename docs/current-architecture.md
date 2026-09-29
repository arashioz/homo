# گزارش معماری فعلی

**تاریخ ممیزی:** ۲۲ اوت ۲۰۲۶  
**دامنه:** کل repository موجود؛ بدون تغییر در داده‌ها یا قابلیت‌های فعلی.

## نتیجهٔ اجرایی

این repository در وضعیت فعلی یک **وب‌سایت عمومی فروش محصولات خانهٔ هوشمند** است که یک پنل کوچک برای مدیریت کاتالوگ دارد. این پروژه در حال حاضر نه CRM عملیاتی است و نه یک Backend مستقل. چند مدل و تابع برای CRM، پروژه، فاکتور و امور مالی در `src/lib` وجود دارد، اما به endpoint و رابط کاربری کسب‌وکار متصل نشده‌اند و دادهٔ عملیاتی آن‌ها خالی است.

بنابراین نقطهٔ شروع مناسب، جایگزین‌کردن کورکورانهٔ سیستم نیست: وب‌سایت و کاتالوگ فعلی حفظ می‌شوند و Business Application با دیتابیس، API و RBAC واقعی در کنار آن ساخته خواهد شد.

## فناوری‌ها و وابستگی‌ها

| حوزه | وضعیت فعلی |
| --- | --- |
| Framework | Next.js `16.3.0` با App Router و Turbopack |
| زبان و UI | TypeScript strict، React `19.2.8`، CSS سراسری و Tailwind CSS v4 (بدون استفادهٔ محسوس از utilityهای Tailwind) |
| فونت و RTL | `next/font/google` برای Vazirmatn و Cormorant Garamond؛ ریشهٔ HTML با `lang="fa"` و `dir="rtl"` |
| API | Next.js Route Handlers در `src/app/api`، Node.js runtime |
| دادهٔ پایدار | فایل‌های JSON روی دیسک محلی در `data/`؛ فایل‌های رسانه‌ای در `public/` |
| احراز هویت | یک کاربر ادمین مبتنی بر متغیر محیطی و کوکی HMAC هفت‌روزه |
| ابزارهای داده | اسکریپت‌های Python برای import PDF/Excel، sync سایت Saveria و watermark |
| دیتابیس/ORM/queue/cache | وجود ندارد |
| تست | هیچ test runner یا تست unit/integration/API تعریف نشده است |

## ساختار repository و مسئولیت‌ها

```text
src/app/                 صفحات عمومی، /admin و Route Handlerهای API
src/components/          اجزای وب‌سایت عمومی
src/components/admin/    پنل کوچک مدیریت کاتالوگ
src/lib/                 مدل‌ها، خواندن/نوشتن JSON، محاسبات و auth
data/                    منبع دادهٔ JSON پایدار فعلی
public/products/         تصاویر محصول
public/projects/         تصاویر نمونه‌کار عمومی
scripts/                 import و همگام‌سازی کاتالوگ
```

### مسیرهای رابط کاربری

| مسیر | نوع | کارکرد |
| --- | --- | --- |
| `/` | Public | صفحهٔ خانه، دسته‌بندی، استعلام و آموزش |
| `/products` | Public | فهرست/جست‌وجوی محصولات |
| `/products/[id]` | Public | جزئیات محصول، سبد، نقد و SEO |
| `/checkout`, `/checkout/done` | Public | ثبت سفارش فروشگاهی در JSON |
| `/guides`, `/guides/[id]` | Public | دانشنامهٔ ثابت/JSON |
| `/admin` | Internal UI | ورود و مدیریت محصول، import/sync کاتالوگ و نمونه‌کار سایت |

`RootLayout` فعلی سبد خرید و footer وب‌سایت عمومی را حتی برای `/admin` نیز رندر می‌کند؛ این جداسازی برای اپ کسب‌وکار مناسب نیست.

## داده و مدل‌های فعلی

### منابع دادهٔ واقعی

| فایل | دادهٔ مشاهده‌شده | مصرف‌کننده |
| --- | --- | --- |
| `data/products.json` | ۳۹۲ محصول، ۳۶۶ تصویر؛ meta کاتالوگ | سایت، API مدیریت محصولات، import/sync |
| `data/projects.json` | ۱ نمونه‌کار عمومی | سایت و API مدیریت نمونه‌کار |
| `data/guides.json` | ۴ راهنما | صفحات راهنما |
| `data/orders.json` | خالی | endpoint سفارش عمومی |
| `data/reviews.json` | خالی | endpoint و UI نظر محصول |
| `data/crm.json` | همهٔ collectionها خالی | فعلاً هیچ Route Handler یا UI ندارد |

### مدل‌های تعریف‌شده در TypeScript

`src/lib/types.ts` مدل‌های زیر را دارد: `Product`، `Project` (نمونه‌کار عمومی)، `AppUser`، `Member`، `Customer`، `ClientProject`، `Task`، `Invoice`، `Payment`، `Expense`، `FundTransaction`، `Installer`، `ProjectInstaller` و `AuditLog`.

این مدل‌ها نقطهٔ مرجع مفیدی هستند، اما schema دیتابیس نیستند و چند ناسازگاری دارند:

- وضعیت‌ها بین legacy و جدید مخلوط‌اند؛ مانند `draft/active/done` و `COMPLETED`، یا `todo/doing/done` و `TODO/IN_PROGRESS/BLOCKED/DONE`.
- `Customer` فقط نام، تلفن، شرکت، نوع، status و چند تاریخ دارد و فیلدهای ایمیل، آدرس، شهر، timeline/follow-up و opportunity ندارد.
- `ClientProject` عضو تیم، نوع پروژه، درصد پیشرفت، وضعیت‌های قابل‌پیکربندی و روابط مالی واقعی ندارد.
- فاکتور خرید، supplier، فایل عمومی، notification، permission و session دیتابیسی مدل نشده‌اند.
- مبلغ‌ها `number` هستند. توابع `money.ts` مبلغ را integer گرد می‌کنند، اما لایهٔ ذخیره‌سازی/constraint مالی وجود ندارد.

## API موجود

| Endpoint | احراز هویت | کارکرد | محدودیت مهم |
| --- | --- | --- | --- |
| `POST /api/admin/login` | عمومی | ورود تک‌ادمین | نام کاربری/رمز پیش‌فرض در کد وجود دارد |
| `POST /api/admin/logout` | کوکی | خروج | — |
| `GET /api/admin/session` | کوکی | وضعیت نشست | — |
| `GET/POST/PATCH/DELETE /api/admin/products` | فقط ورود، بدون permission | کاتالوگ JSON و تصویر | validation، pagination و کنترل هم‌زمانی ندارد |
| `GET/POST/DELETE /api/admin/projects` | فقط ورود | نمونه‌کار عمومی | حذف فایل تصویر همراه حذف رکورد است |
| `GET/POST /api/admin/upload` | فقط ورود | import PDF/XLSX کاتالوگ | اجرای Python و نوشتن فایل روی سرور |
| `POST /api/admin/sync-saveria` | فقط ورود | اجرای sync Python | وابسته به process محلی و شبکه |
| `POST /api/orders` | عمومی | ثبت سفارش JSON | قیمت از درخواست client پذیرفته می‌شود |
| `GET/POST /api/reviews` | عمومی | خواندن/ثبت نظر | بدون rate limit/moderation |

ساختار پاسخ‌ها یکسان نیست (`{ ok }`، `{ error }` و payloadهای مختلف). Endpointهای مشتری، CRM، پروژهٔ داخلی، task، فاکتور، پرداخت، هزینه، فایل، اعلان، گزارش و RBAC وجود ندارند.

## احراز هویت و مجوزدهی

- `admin-auth.ts` کوکی HttpOnly/SameSite=Lax با HMAC-SHA256 می‌سازد؛ در production گزینهٔ Secure فعال است.
- حساب‌های `AppUser` و هش scrypt تعریف شده‌اند، اما ورود فقط با `ADMIN_USERNAME`/`ADMIN_PASSWORD` انجام می‌شود و `seedDefaultUsers` عملاً کاربر ایجاد نمی‌کند.
- هر نشست معتبر دسترسی کامل دارد؛ role payload عملاً در authorization استفاده نمی‌شود.
- اگر متغیر محیطی تنظیم نشود، credential و secret پیش‌فرض ناامن در کد فعال می‌شود.
- صفحهٔ `/admin` در لایهٔ route محافظت نشده؛ UI پس از load وضعیت نشست را بررسی می‌کند. APIهای حساس عمدتاً auth را چک می‌کنند، ولی policy مجزای permission ندارند.

## قابلیت‌های موجود که باید حفظ شوند

1. کاتالوگ ۳۹۲ محصولی، تصاویر و metadata آن؛ این داده، با import idempotent، به Product/Asset جدید منتقل می‌شود.
2. صفحات عمومی RTL، SEO metadata، JSON-LD، sitemap و robots.
3. تجربهٔ browse محصول، جزئیات محصول، سبد خرید و ثبت سفارش عمومی.
4. import PDF/XLSX و sync Saveria؛ این‌ها باید به job امن و audit‌شده تبدیل شوند، نه حذف شوند.
5. نمونه‌کارهای سایت و راهنماها؛ در آینده زیر CMS باقی می‌مانند.
6. منطق محاسبات اولیهٔ `invoice-utils.ts`، `finance.ts` و `money.ts` صرفاً به‌عنوان ورودی تست و بازبینی؛ نه منبع نهایی حقیقت مالی.

## مواردی که باید migrate شوند

| منبع قدیمی | مقصد پیشنهادی | روش ایمن |
| --- | --- | --- |
| `products.json` | Product، ProductImage، Category، Brand | import نسخه‌دار با کلید legacy id/SKU و checksum |
| تصاویر `public/products` | object storage/Asset | انتقال مرحله‌ای؛ URL قدیمی تا تأیید حفظ شود |
| `projects.json` | CMS PortfolioProject | import جدا از `Project` عملیاتی CRM |
| `guides.json` | CMS Article/Guide | import idempotent با slug فعلی |
| `orders.json` | WebsiteOrder/Lead یا Customer + SalesOrder | فقط پس از تعریف قانون consent و dedupe شماره تلفن |
| `reviews.json` | ProductReview | import idempotent |
| `crm.json` | entityهای CRM/Finance جدید | اکنون خالی است؛ migration schema-only، بدون حذف فایل |

قبل از هر migration، snapshot read-only از همهٔ JSONها و manifest شمارش/هش ساخته می‌شود. هیچ فایل یا رکوردی در Phase 1 حذف یا تغییر نکرده است.

## مسائل معماری و ریسک‌ها

### بحرانی

1. **دیتابیس وجود ندارد.** نوشتن هم‌زمان به JSON می‌تواند داده را از بین ببرد و روی serverless/چند instance پایدار نیست.
2. **اعتبارنامهٔ پیش‌فرض hard-coded** در `admin-auth.ts` با نمونهٔ `.env.example` نیز ناسازگار است؛ پیش از هر انتشار باید حذف شود.
3. **RBAC واقعی وجود ندارد.** نقش‌ها صرفاً type هستند و data-scoping فروشنده/مدیرپروژه پیاده‌سازی نشده است.
4. **درستی مالی تضمین نمی‌شود.** سفارش عمومی `price` را از client می‌پذیرد؛ فاکتور و پرداخت transaction، immutable ledger و server-side pricing ندارند.
5. **حذف destructive بدون safeguard کافی.** API حذف محصول و نمونه‌کار confirmation/audit/backup/soft-delete ندارد؛ حذف نمونه‌کار فایل تصویر را هم پاک می‌کند.

### مهم

1. build فعلی شکست می‌خورد: `shopFaqJsonLd` در `src/lib/seo.ts` export نشده، در حالی‌که `products/page.tsx` آن را import می‌کند. همچنین دریافت Google Fonts در محیط بدون شبکه شکست می‌خورد.
2. lint فعلی ۶ خطا دارد (استفادهٔ Link، setState در effect، Date.now در render و `prefer-const`).
3. APIها schema validation، rate limit، pagination، filter/sort استاندارد، error envelope و observability ندارند.
4. uploadها validation کامل حجم/MIME، antivirus و storage abstraction ندارند؛ endpoint sync/upload پردازش فرایند خارجی را هم‌زمان با درخواست انجام می‌دهد.
5. `globals.css` بسیار بزرگ است (۵٬۸۰۲ خط) و design system جدا و tokenized برای SaaS ندارد.
6. public website و admin در یک root layout و یک deployable هستند؛ مرزهای CMS و Business App تعریف نشده‌اند.
7. test suite و migration framework وجود ندارد.

## پیشنهاد جهت معماری Phase 2 (بدون پیاده‌سازی)

دو گزینهٔ قابل اجرا وجود دارد. با توجه به repository فعلی، پیشنهاد من **modular monolith** است: وب‌سایت عمومی Next.js حفظ شود و Business App به‌صورت workspace/app مستقل Ionic React + TypeScript با یک API service مستقل پشت آن قرار گیرد. هر دو از database و API مشترک استفاده کنند. اگر محدودیت استقرار یا تیم، جداسازی را فعلاً پرهزینه می‌کند، API service همچنان باید از Next UI جدا و به‌صورت ماژول domain-first طراحی شود تا انتقال بعدی کم‌ریسک باشد.

در Phase 2 باید قبل از کدنویسی گسترده، این خروجی‌ها تصویب شوند:

1. `docs/new-architecture.md`: مرز سرویس‌ها، deployment، storage، queue، API conventions و ADRها.
2. `docs/database-schema.md`: ERD و schema پولی integer/decimal، indexها، audit و migration strategy.
3. انتخاب صریح دیتابیس managed PostgreSQL، ORM/migration tool، object storage و provider احراز هویت/session.
4. قرارداد هم‌زیستی وب‌سایت عمومی، CMS و Business App؛ شامل compatibility برای URLهای محصول فعلی.

## معیار خروج از Phase 1

- [x] repository، مسیرهای public/admin، Route Handlerها و libraryهای domain خوانده شدند.
- [x] schema فعلی داده‌های JSON و داده‌های موجود بررسی شدند.
- [x] authentication/authorization و مدل‌های Product/Customer/Invoice/User/Order بررسی شدند.
- [x] dependencyها، scriptها و سلامت lint/build بررسی شد.
- [x] قابلیت‌های نگهداری، migration، حذف/بازطراحی و ریسک‌ها ثبت شدند.
- [ ] طراحی معماری جدید و schema دیتابیس: منوط به تأیید برای Phase 2.

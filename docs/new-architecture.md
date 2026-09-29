# معماری پیشنهادی Smart Home Business CRM

**وضعیت:** پیشنهادی برای Phase 2  
**تصمیم:** بک‌اند مستقل، modular monolith و مرزبندی صریح Website/CMS/Business.

## تصمیم معماری

سه سرویس مستقل در یک monorepo نگهداری می‌شوند؛ یک backend واحد مالک تمام منطق و داده‌ها است:

```text
apps/
  crm-frontend/   Ionic React: اپ داخلی RTL برای CRM، پروژه و مالی
backend/          NestJS: REST API، authorization، سایت، CRM و منطق کسب‌وکار
packages/
  api-contract/  DTO/typeهای تولیدشده از OpenAPI (بدون entity مشترک)
  ui-tokens/     design tokens، typography و آیکون‌های مشترک
infra/           Docker، migration و deployment manifests
```

سایت Next.js و CRM frontend هر دو فقط با `backend/` صحبت می‌کنند. MongoDB تنها منبع داده است و هیچ clientی مستقیماً به دیتابیس وصل نمی‌شود. مسیر قدیمی `apps/api` حذف شده است.

## تکنولوژی منتخب

| لایه | انتخاب | دلیل |
| --- | --- | --- |
| API | NestJS، TypeScript strict، REST versioned (`/v1`) | ماژول/Controller/Service/Repository/DTO مطابق نیاز پروژه |
| DB | MongoDB | document model مناسب CRM/CMS، index، transaction و scale مستقل |
| Data access | Mongoose + schema/indexهای صریح | validation domain، document model و Mongo transaction |
| Auth | session دیتابیسی + access token کوتاه‌عمر HttpOnly cookie | revoke، role/permission و audit قابل اتکا |
| Validation | class-validator/class-transformer در DTO + validation pipe global | اعتبارسنجی در مرز API |
| Files | S3-compatible object storage | جداسازی فایل از instance API، URL امضاشده و retention |
| Jobs | Redis + BullMQ | import کاتالوگ، thumbnail، reminder و notification بدون block کردن request |
| API Docs | OpenAPI/Swagger در محیط داخلی | contract قابل تست برای website و business |
| Website | Next.js موجود، App Router | حفظ SEO و URLهای عمومی |
| Business | Ionic React + TypeScript + Tailwind + Lucide | UI SaaS RTL و responsive برای laptop/tablet |

## مرزهای محصول

### Website و CMS

- Home، About، Services، Contact، Blog/Guides، Products و Product Details.
- فقط محصولات `ACTIVE` و محتوای `PUBLISHED` را از API عمومی می‌خواند.
- Checkout یک `WebsiteOrder`/lead می‌سازد؛ قیمت و موجودی فقط در API محاسبه می‌شود.
- CMS فقط صفحات، مقاله‌ها، رسانه، SEO، دسته‌بندی و کاتالوگ را مدیریت می‌کند؛ CRM و حسابداری در آن نمایش داده نمی‌شود.

### Business Application

- مسیر مستقل مانند `app.example.ir` با login مستقل و layout جدا: sidebar سمت راست، topbar، breadcrumb، header.
- Dashboard، CRM، Customers، Projects، My Tasks، Invoices، Finance، Products، Team، Reports، Website/CMS و Settings.
- تمام mutationها به API مستقل می‌روند؛ client تنها state نمایش و فرم را نگه می‌دارد.

### API domains

| Module | مسئولیت |
| --- | --- |
| `auth`, `identity`, `access` | login، session، role و permission |
| `crm` | customer، lead، opportunity، follow-up، note، timeline |
| `projects` | project، member، status، template، progress و activity |
| `tasks` | task، checklist، comment، assignment، board/calendar |
| `catalog` | product، category، brand، price و public product read |
| `sales` | invoice، invoice item، payment، document print snapshot |
| `finance` | purchase invoice، expense، ledger، project profitability |
| `files` | attachment، upload policy، scan/status و signed URL |
| `notifications` | in-app notifications و scheduled reminders |
| `reports` | read-only aggregate queries و export |
| `cms` | pages، articles، SEO و portfolio |
| `audit` | append-only activity/audit log |
| `migration` | legacy JSON import، manifest و reconciliation |

## API standards

- هر endpoint زیر `/v1` و OpenAPI مستند می‌شود.
- پاسخ موفق: `{ "success": true, "data": ..., "meta": ... }`.
- پاسخ خطا: `{ "success": false, "message": "...", "code": "...", "errors": [] }`.
- listها `page`، `limit` (حداکثر 100)، `sort`، `q` و filterهای allow-listed دارند.
- currency amounts در JSON به‌صورت integer minor/base unit یا string decimal تعریف‌شده در قرارداد است؛ هرگز float نیست.
- pagination cursor برای feed/timelineهای بزرگ و offset pagination برای لیست‌های مدیریتی.
- controller فقط transport را مدیریت می‌کند؛ service policy/transaction را اجرا می‌کند و repository query را.
- idempotency key برای ثبت payment، invoice issue، import و webhook.

## Auth و RBAC

Roleهای پایه: `SUPER_ADMIN`، `ADMIN`، `SALES_MANAGER`، `SALES`، `PROJECT_MANAGER`، `EMPLOYEE` و `ACCOUNTANT`.

Permissionها resource/action محورند: مانند `customer.read`، `customer.assign`، `project.update`، `task.assign`، `invoice.issue`، `payment.create`، `finance.read` و `cms.publish`.

Guardها هم permission و هم **scope** را در API کنترل می‌کنند:

- Sales فقط customer/leadهای assigned خود و فعالیت‌های همان‌ها را می‌خواند.
- Project Manager فقط projectهای manager/member خود و taskهای مرتبط را می‌بیند.
- Employee فقط taskهای assigned خودش را تغییر می‌دهد.
- Accountant فقط domainهای مالی مجاز را می‌بیند و هیچ مبلغ محاسبه‌شده‌ای را از client قبول نمی‌کند.

## Financial integrity

1. snapshot قیمت محصول و نام در `InvoiceItem` هنگام issue شدن ثبت می‌شود.
2. amountها integer در واحد پایه قابل‌تنظیم (پیشنهاد: IRR) ذخیره می‌شوند؛ نمایش TOMAN فقط presentation است.
3. discount، tax، total، paid و outstanding فقط در service و داخل transaction محاسبه می‌شود.
4. invoice issued و payment ثبت‌شده immutable هستند؛ اصلاح از مسیر credit note/reversal انجام می‌شود، نه update مخرب.
5. هر mutation مالی audit event و ledger entry می‌سازد.

## Lifecycle و migration

1. Backup read-only و manifest/hash برای JSONهای فعلی.
2. ایجاد schema جدید فقط با migration forward.
3. import idempotent با `legacy_source` و `legacy_id`؛ محصول‌ها با SKU و id قدیمی reconcile می‌شوند.
4. validation count، checksum و sample verification قبل از cutover.
5. website ابتدا با compatibility adapter از JSON/API خوانده می‌شود؛ پس از تأیید، API منبع حقیقت می‌شود.
6. حذف JSON، عکس یا entity قدیمی فقط با تأیید کتبی، backup قابل‌بازگشت و زمان retention.

## ترتیب اجرا

1. تثبیت website و پنل کاتالوگ فعلی (build/lint، حذف credential پیش‌فرض، محافظت از حذف‌ها).
2. تثبیت backend واحد NestJS، MongoDB/Docker و health check.
3. Auth/RBAC و employee/team.
4. CRM.
5. Projects و task templates.
6. Task board/calendar.
7. Sales invoice/payment/print.
8. Purchase invoice/expense/profitability.
9. Dashboard/reports/notifications.
10. migration و تبدیل پنل فعلی به CMS catalog.

## معیارهای غیرعملکردی

- RTL و Persian-first؛ آزمون در 1280×720، 1366×768، 1440×900 و 1920×1080.
- audit برای mutationهای حساس و soft delete برای business data.
- rate limit برای public endpoints، CORS allow-list، security headers و structured logs.
- unit test برای محاسبات مالی، integration test برای transaction/RBAC و API test برای contractها.
- backup روزانه DB و object storage؛ restore drill دوره‌ای.

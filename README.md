This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## اجرا با Docker و رم محدود

این پروژه علاوه بر سایت Next.js، بک‌اند NestJS، پنل CRM و MongoDB را اجرا می‌کند.
مصرف رم هنگام ساخت imageها با مصرف اجرای نسخهٔ آماده متفاوت است؛ اجرای کامل
روی سرور ۱ گیگابایتی بدون اندازه‌گیری و تست بار تضمین نشده است.

```bash
# ساخت ترتیبی imageها و اجرا
./up.sh

# معادل با Docker Compose؛ از ریشهٔ پروژه اجرا شود
COMPOSE_BAKE=false COMPOSE_PARALLEL_LIMIT=1 docker compose build crm-backend crm-frontend web-frontend
docker compose up -d --no-build

# اجرای imageهای موجود، بدون ساخت دوباره
./up.sh --no-build

# مشاهدهٔ مصرف سرویس‌ها و خطاهای راه‌اندازی
docker stats --no-stream
docker compose logs --tail=100
```

برای سرور کم‌رم، imageها را روی دستگاه یا CI با حافظهٔ کافی و معماری CPU سازگار
با سرور بسازید و از طریق registry یا `docker save` / `docker load` منتقل کنید؛
سپس `./up.sh --no-build` را اجرا کنید. فایل‌های داده و تصاویرِ mountشده در
`docker-compose.yml` نیز باید روی سرور موجود باشند. گزینهٔ `--no-build` بدون
imageهای آماده، نصب اولیه را انجام نمی‌دهد و تغییرات کد را هم build نمی‌کند.

ساخت Next.js به یک worker و یک صفحهٔ هم‌زمان محدود شده و بهینه‌سازی حافظهٔ
Webpack فعال است؛ این تنظیمات سقف مصرف کل سیستم نیستند. اجرای عادی Docker از
نسخهٔ production استفاده می‌کند؛ `npm run dev` برای توسعه است.

در image بک‌اند فقط وابستگی‌های workspace بک‌اند نصب می‌شوند. پس از build،
وابستگی‌های توسعه با `npm prune --omit=dev` حذف می‌شوند و نصب دومی وجود ندارد.
محدودکردن هم‌زمانی Compose به‌تنهایی اجرای هم‌زمان stageهای مستقل داخل یک
Dockerfile را متوقف نمی‌کند؛ به همین دلیل مرحلهٔ production بک‌اند به خروجی
ساخت وابسته است. هشدار `deprecated inflight` به‌تنهایی علت شکست build نیست؛
برای تشخیص `signal: killed`، لاگ OOM سیستم‌عامل و وضعیت حافظه بررسی شود.

اگر دانلود Python از `files.pythonhosted.org` با `ReadTimeoutError` روبه‌رو شد،
مشکل مربوط به اتصال دانلود است. مهلت ارتباط pip در Dockerfile برابر ۱۲۰ ثانیه
و تعداد retryها ۱۰ تنظیم شده است. مرحلهٔ نصب بسته‌های سیستم‌عامل جداست تا
پس از شکست دانلود، در تلاش بعدی از کش استفاده شود. در صورت نیاز، مهلت را با
`docker compose build --build-arg PIP_DOWNLOAD_TIMEOUT=300 web-frontend`
بیشتر کنید؛ افزایش مهلت، قطع یا مسدودبودن دسترسی به سرویس دانلود را حل نمی‌کند.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

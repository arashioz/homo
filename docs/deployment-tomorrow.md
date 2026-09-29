# استقرار فردای CRM و وب‌سایت

این repository اکنون سه سرویس قابل اجرا دارد:

- `crm-backend`: API مستقل NestJS روی MongoDB، پورت پیش‌فرض `4000`
- `crm-frontend`: پنل Ionic/React برای موبایل، پورت پیش‌فرض `8100`
- `web-frontend`: وب‌سایت فعلی Next.js، پورت پیش‌فرض `3000`

وب‌سایت در مرحلهٔ انتقال است: route handlerهای فعلی Next.js هنوز موقتاً نقش web backend را دارند. کانتینر و volume آن از CRM مستقل است و تبدیل آن به `web-backend` مستقل، بدون از دست‌دادن سایت فعلی انجام خواهد شد.

## پیش‌نیاز سرور

- Docker Engine و Docker Compose v2
- باز بودن فقط پورت‌های reverse proxy (معمولاً `80` و `443`) در فایروال؛ پورت‌های Mongo و Redis منتشر نمی‌شوند.
- یک reverse proxy مانند Nginx یا Caddy برای TLS و اتصال دامنه‌ها. Next.js برای اجرای عمومی مستقیم طراحی نشده است.

## تنظیم secrets

روی سرور، در ریشهٔ repository:

```bash
cp infra/.env.example infra/.env
openssl rand -hex 32
```

خروجی دستور دوم را برای `MONGO_ROOT_PASSWORD`، `JWT_SECRET` و `WEB_ADMIN_SESSION_SECRET` (هر بار مقدار متفاوت) در `infra/.env` قرار دهید. مقادیر نمونه را هرگز deploy نکنید.

همچنین این موارد را حتماً تنظیم کنید:

- `WEB_PUBLIC_URL`: دامنهٔ اصلی سایت، مثلاً `https://homo.ir`
- `CRM_PUBLIC_API_URL`: آدرس عمومی API با `/v1` در انتها، مثلاً `https://api.crm.example.com/v1`
- `CRM_CORS_ORIGINS`: دامنهٔ CRM و در صورت نیاز آدرس توسعهٔ محلی، با کاما جدا شده
- `CRM_ADMIN_USERNAME` و `CRM_ADMIN_PASSWORD`
- `WEB_ADMIN_USERNAME` و `WEB_ADMIN_PASSWORD`

رمز Mongo را به شکل hexadecimal بسازید تا در `MONGODB_URI` به URL-encoding نیاز نداشته باشد.

## build و اجرا

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml config
docker compose --env-file infra/.env -f infra/docker-compose.yml up --build -d
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
curl --fail http://127.0.0.1:4000/v1/health
curl --fail --head http://127.0.0.1:3000
```

MongoDB به‌صورت single-node replica set (`rs0`) بالا می‌آید. این مورد برای تراکنش‌های مالی CRM لازم است. `mongo-init` فقط در بوت اول replica set را می‌سازد و در اجراهای بعدی با موفقیت خارج می‌شود.

اگر پیش از این Mongo volume ساخته‌اید و آن standalone بوده است، بدون بررسی پاک نکنید. ابتدا backup بگیرید، سپس مسیر migration replica set را روی همان volume آزمایش کنید.

## تست با موبایل در شبکهٔ محلی

در production پورت‌ها فقط به `127.0.0.1` bind می‌شوند تا از طریق reverse proxy در دسترس باشند. برای تست کوتاه‌مدت CRM با گوشی در همان شبکه، در `infra/.env` این دو مقدار را متناسب با IP دستگاه توسعه تنظیم کنید:

```dotenv
HOST_BIND_ADDRESS=0.0.0.0
CRM_PUBLIC_API_URL=http://192.168.1.10:4000/v1
CRM_CORS_ORIGINS=http://192.168.1.10:8100,http://localhost:8100
```

سپس `crm-frontend` را دوباره build کنید و CRM را با `http://192.168.1.10:8100` باز کنید. پس از تست، `HOST_BIND_ADDRESS` را به `127.0.0.1` برگردانید و فقط دامنه‌های HTTPS را در CORS نگه دارید.

## اتصال دامنه‌ها

Nginx/Caddy باید درخواست‌ها را به این سرویس‌ها forward کند:

| دامنه | upstream |
| --- | --- |
| `homo.ir` | `http://127.0.0.1:3000` |
| `api.crm.example.com` | `http://127.0.0.1:4000` |
| `crm.example.com` | `http://127.0.0.1:8100` |

در reverse proxy محدودیت حجم upload و timeout مناسب برای مسیرهای پنل وب اعمال کنید. برای Next.js buffering را غیرفعال نگه دارید تا streaming در آینده مختل نشود.

یک نمونهٔ آمادهٔ Nginx در [homo.conf.example](../infra/nginx/homo.conf.example) قرار دارد. پس از جایگزین کردن دامنه‌ها و گرفتن certificate، آن را در Nginx فعال و با `nginx -t` بررسی کنید.

## داده‌های پایدار و backup

Compose برای داده‌های زیر volume جدا دارد:

- `homo_mongo_data`: تمام داده‌های CRM
- `homo_redis_data`: queue/cache احتمالی
- `homo_web_data`: کاتالوگ، سفارش و reviewهای وب فعلی
- `homo_web_product_images` و `homo_web_project_images`: تصاویر پنل وب
- `homo_web_uploads`: فایل‌های آپلودشدهٔ پنل وب

از volume Mongo روزانه backup منطقی بگیرید؛ backup volume خام در زمان روشن‌بودن دیتابیس جایگزین `mongodump` نیست. حداقل پیش از هر upgrade تصویرها، نام image/tag و timestamp backup را ثبت کنید.

برای دیدن logها:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml logs -f crm-backend web-frontend
```

برای توقف بدون حذف داده:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml down
```

از `down -v` در production استفاده نکنید؛ همهٔ volumeهای داده را حذف می‌کند.

## محدودیت فعلی وب

Docker image وب Python و ابزارهای import کاتالوگ را نیز دارد تا بخش admin فعلی بدون تغییر باقی بماند. داده‌های فایل‌محور وب فقط برای دورهٔ انتقال هستند؛ در فاز `web-backend` به دیتابیس و API مستقل منتقل می‌شوند.

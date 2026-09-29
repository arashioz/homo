# CRM Frontend

اپلیکیشن مستقل Ionic React برای CRM خانه هوشمند است. به‌صورت RTL و mobile-first طراحی شده و به CRM API متصل می‌شود.

## اجرای محلی

```bash
cp .env.example .env
npm install
npm run dev
```

اپلیکیشن روی `http://localhost:8100` اجرا می‌شود. برای تست با گوشی، مقدار `VITE_CRM_API_URL` را به IP قابل دسترسی سرور API تغییر دهید و همان origin را در `CORS_ORIGINS` بک‌اند مجاز کنید.

## Docker

```bash
docker build \
  --build-arg VITE_CRM_API_URL=https://crm-api.example.com/v1 \
  -t homo-crm-frontend .
docker run --rm -p 8100:80 homo-crm-frontend
```

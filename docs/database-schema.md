# طرح دیتابیس MongoDB

**Database:** MongoDB 8 در Docker  
**قاعده:** هیچ دادهٔ legacy حذف یا خودکار import نمی‌شود.

## قراردادهای داده

- تمام collectionها `_id: ObjectId`، `createdAt`، `updatedAt` و برای داده‌های عملیاتی `deletedAt` دارند.
- مبلغ‌ها `Long`/`bigint` در کوچک‌ترین واحد پول تنظیم‌شده‌اند؛ float ممنوع است.
- ObjectIdهای رابطه در schema اعتبارسنجی می‌شوند؛ MongoDB transaction برای mutationهای مالی چندسندی استفاده می‌شود.
- indexها در schema Mongoose تعریف و در deployment مدیریت می‌شوند؛ TTL فقط برای sessionهای منقضی‌شده است.
- هر سند import‌شده `legacy: { source, id, checksum, importedAt }` دارد و index ترکیبی unique روی آن می‌گیرد.

## collectionها

| Domain | Collection | فیلدها و indexهای اصلی |
| --- | --- | --- |
| Identity | `users` | username unique، passwordHash، fullName، email، phone، active، roleIds |
| Access | `roles`, `permissions` | `code` unique؛ role شامل permissionCodes است |
| Session | `sessions` | userId، tokenHash unique، expiresAt TTL، revokedAt، ip، userAgent |
| CRM | `customerTypes`, `crmStatuses` | name unique، active، sortOrder |
| CRM | `customers` | name، companyName، mobile، email، address، city، typeId، statusId، assignedSalesId؛ indexes: mobile، statusId+assignedSalesId، nextFollowUpAt |
| CRM | `opportunities` | customerId، ownerId، stageId، estimatedAmount، probability، expectedCloseDate |
| CRM | `followUps` | customerId، opportunityId، assigneeId، type، scheduledAt، completedAt، status |
| CRM | `customerTimeline` | customerId، actorId، eventType، subject، metadata، occurredAt؛ append-only |
| Projects | `projects` | code unique، customerId، managerId، memberIds، typeId، statusId، dates، budgetAmount، progressMode، manualProgress |
| Projects | `projectTemplates` | projectTypeId، tasks[] (title, sequence, priority, relativeDueDays, checklistTemplate) |
| Tasks | `tasks` | projectId، customerId، assigneeId، creatorId، status، priority، dates، checklist[]، comments[]، sortKey; indexes assigneeId+status+dueAt و projectId+status |
| Catalog/CMS | `products`, `productCategories`, `brands` | sku unique، slug unique، legacy id، costAmount، saleAmount، stockQuantity، active؛ product images[] |
| Catalog/CMS | `pages`, `articles`, `portfolioProjects` | slug unique، status، SEO، publishedAt؛ portfolio جدا از project عملیاتی |
| Web sales | `websiteOrders` | customer snapshot، lines با productId و server-calculated price snapshot، totalAmount، status |
| Sales | `invoices` | number unique، customerId، projectId، issue/due dates، status، amount snapshots، items[] |
| Finance | `payments`, `suppliers`, `purchaseInvoices`, `expenses` | invoice/project refs، amount، payment/status، attachment refs |
| Finance | `ledgerEntries` | append-only: sourceType+sourceId+accountCode unique، direction، amount، currency، projectId |
| Shared | `files`, `notifications`, `activityLogs` | storage metadata/linkها؛ notification read state؛ audit append-only |
| Migration | `migrationRuns`, `migrationRecords` | run summary و unique(source, legacyId, targetType) |

## مرز embedding و referencing

- **Embed:** invoice items، task checklist/comments کوچک، product images، template tasks و website order lines؛ snapshot تاریخی را پایدار نگه می‌دارد.
- **Reference:** user، customer، project، task، invoice، payment، supplier، file و notification؛ برای رشد مستقل، مجوز و queryهای گزارش.
- timeline، ledger و audit همیشه collection جدا و append-only هستند.

## تراکنش‌های ضروری

1. صدور فاکتور: validate product/price، ساخت Invoice، LedgerEntry و ActivityLog در یک Mongo session.
2. ثبت پرداخت: idempotency/reference check، update paid/remaining/status فاکتور، ledger و audit در یک transaction.
3. ایجاد پروژه از lead: Project، اعضا، taskهای template و timeline در یک transaction.
4. import legacy: migration record و target document با unique index؛ امکان اجرای مجدد بدون duplicate.

## Docker

MongoDB در `infra/docker-compose.yml` با volume پایدار `homo_mongo_data`، احراز هویت root و healthcheck اجرا می‌شود. URI توسعه در `backend/.env.example` آمده است. Redis در همان compose برای queue و notification آینده باقی می‌ماند.

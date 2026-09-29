"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/users";
import type { Product, Project } from "@/lib/types";
import type { Guide } from "@/lib/guides";
import type { ShopSettings } from "@/lib/shop-settings";
import type { ShopOrder } from "@/lib/orders";
import { categoryOptions } from "@/lib/catalog-taxonomy";
import { formatPrice } from "@/lib/products-client";
import { AdminSeoDashboard } from "@/app/admin/seo-dashboard";

type Area = "products" | "articles" | "site" | "sync" | "seo";
type Catalog = { products: Product[]; meta?: { productCount?: number; updatedAt?: string } };

const AREAS: Array<{ id: Area; label: string }> = [
  { id: "products", label: "مدیریت محصولات" },
  { id: "articles", label: "مقاله‌های سایت" },
  { id: "site", label: "مدیریت سایت" },
  { id: "sync", label: "آپدیت سایت مادر" },
  { id: "seo", label: "سئو و هوش مصنوعی" },
];

export function AdminConsole({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [area, setArea] = useState<Area>("products");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="admin-app" style={{ minHeight: "100vh" }}>
      <header className="admin-app-bar">
        <div>
          <p>پنل مدیریت اصلی سایت · HOMO</p>
          <h1>مدیریت فروشگاه، مقاله و آپدیت کاتالوگ</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--cream-dim)" }}>
            کاربر: <b>{user.name}</b>
          </span>
          <button type="button" className="admin-app-logout" onClick={() => void logout()}>
            خروج
          </button>
        </div>
      </header>
      <div className="admin-app-body">
        <div className="admin-tabs admin-tabs-scroll">
          {AREAS.map((item) => (
            <button key={item.id} type="button" className={area === item.id ? "active" : ""} onClick={() => setArea(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {area === "seo" ? <AdminSeoDashboard user={user} hideChrome /> : <AdminSitePanel area={area} />}
      </div>
    </div>
  );
}

function AdminSitePanel({ area }: { area: Exclude<Area, "seo"> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [cron, setCron] = useState<Record<string, unknown> | null>(null);

  const products = catalog?.products ?? [];
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const selectedGuide = guides.find((guide) => guide.id === guideId) ?? null;
  const cats = useMemo(() => categoryOptions(products.map((product) => product.category)), [products]);

  const load = useCallback(async () => {
    const [productsRes, guidesRes, projectsRes, ordersRes, settingsRes, cronRes] = await Promise.all([
      fetch("/api/admin/products").then((res) => res.json()),
      fetch("/api/admin/guides").then((res) => res.json()),
      fetch("/api/admin/projects").then((res) => res.json()),
      fetch("/api/admin/orders").then((res) => res.json()),
      fetch("/api/admin/shop-settings").then((res) => res.json()),
      fetch("/api/admin/catalog-cron").then((res) => res.json()),
    ]);
    if (productsRes.ok) setCatalog(productsRes.catalog);
    if (guidesRes.ok) setGuides(guidesRes.guides);
    if (projectsRes.ok) setProjects(projectsRes.projects);
    if (ordersRes.ok) setOrders(ordersRes.orders);
    if (settingsRes.ok) setSettings(settingsRes.settings);
    if (cronRes.ok) setCron(cronRes.status);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(q) ||
        String(product.id).includes(q) ||
        product.category.toLowerCase().includes(q),
    );
  }, [products, query]);

  async function jsonFetch(url: string, init?: RequestInit) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      setMessage(data.publish?.published === false ? `ذخیره شد. انتشار زنده: ${data.publish.reason}` : "ذخیره شد");
      await load();
      return data;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (area === "products") {
    return (
      <div className="admin-split">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>کاتالوگ ({products.length.toLocaleString("fa-IR")})</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void jsonFetch("/api/admin/products", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: "محصول جدید", specs: "توضیح کوتاه محصول", category: "سایر" }),
                }).then((data) => data?.product && setSelectedId(data.product.id))
              }
            >
              محصول جدید
            </button>
          </div>
          <input className="admin-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو در نام، کد یا دسته" />
          {message && <p>{message}</p>}
          <div className="admin-product-grid">
            {filtered.slice(0, 80).map((product) => (
              <button
                key={product.id}
                type="button"
                className={`admin-product-card ${selectedId === product.id ? "active" : ""}`}
                onClick={() => setSelectedId(product.id)}
              >
                <div className="admin-product-card-media">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" />
                  ) : (
                    <span className="admin-thumb-empty" />
                  )}
                </div>
                <div className="admin-product-card-body">
                  <strong>{product.title}</strong>
                  <span className="admin-product-card-cat">{product.category}</span>
                  <span className="admin-product-card-price">{formatPrice(product.price, product.priceLabel)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <h2>ویرایش محصول</h2>
          {selected ? (
            <ProductEditor
              key={selected.id}
              product={selected}
              categories={cats}
              busy={busy}
              onSave={(body) => void jsonFetch(`/api/admin/products/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })}
              onDelete={() =>
                void jsonFetch(`/api/admin/products/${selected.id}`, { method: "DELETE" }).then(() => setSelectedId(null))
              }
              onUpload={async (file) => {
                const form = new FormData();
                form.set("file", file);
                form.set("productId", String(selected.id));
                await jsonFetch("/api/admin/upload", { method: "POST", body: form });
              }}
            />
          ) : (
            <p>یک محصول را از لیست انتخاب کنید.</p>
          )}
        </section>
      </div>
    );
  }

  if (area === "articles") {
    return (
      <div className="admin-split">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>مقاله‌ها</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void jsonFetch("/api/admin/guides", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: "مقاله جدید", excerpt: "خلاصه مقاله", body: "متن مقاله", status: "draft" }),
                }).then((data) => data?.guide && setGuideId(data.guide.id))
              }
            >
              مقاله جدید
            </button>
          </div>
          {message && <p>{message}</p>}
          <div className="admin-product-list">
            {guides.map((guide) => (
              <button
                key={guide.id}
                type="button"
                className={`admin-list-btn ${guideId === guide.id ? "active" : ""}`}
                onClick={() => setGuideId(guide.id)}
              >
                <strong>{guide.title}</strong>
                <span>
                  {guide.category} · {guide.status === "draft" ? "پیش‌نویس" : "منتشرشده"}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <h2>ویرایش مقاله</h2>
          {selectedGuide ? (
            <GuideEditor
              key={selectedGuide.id}
              guide={selectedGuide}
              busy={busy}
              onSave={(body) => void jsonFetch(`/api/admin/guides/${selectedGuide.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })}
              onDelete={() => void jsonFetch(`/api/admin/guides/${selectedGuide.id}`, { method: "DELETE" }).then(() => setGuideId(null))}
            />
          ) : (
            <p>یک مقاله را انتخاب کنید.</p>
          )}
        </section>
      </div>
    );
  }

  if (area === "site") {
    return (
      <div className="admin-split">
        <section className="admin-panel">
          <h2>تنظیمات فروشگاه</h2>
          {settings && (
            <form
              className="admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void jsonFetch("/api/admin/shop-settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    checkoutMode: form.get("checkoutMode"),
                    paymentGatewayUrl: form.get("paymentGatewayUrl"),
                    whatsappPhone: form.get("whatsappPhone"),
                  }),
                });
              }}
            >
              <label>
                روش تسویه
                <select name="checkoutMode" defaultValue={settings.checkoutMode}>
                  <option value="WHATSAPP">واتساپ</option>
                  <option value="ONLINE">درگاه آنلاین</option>
                </select>
              </label>
              <label>
                شماره واتساپ
                <input name="whatsappPhone" defaultValue={settings.whatsappPhone} />
              </label>
              <label>
                آدرس درگاه
                <input name="paymentGatewayUrl" defaultValue={settings.paymentGatewayUrl} />
              </label>
              <button type="submit" disabled={busy}>
                ذخیره تنظیمات سایت
              </button>
            </form>
          )}
          <h2>نمونه‌کارها</h2>
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void jsonFetch("/api/admin/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: form.get("title"),
                  location: form.get("location"),
                  description: form.get("description"),
                  image: form.get("image"),
                }),
              });
              event.currentTarget.reset();
            }}
          >
            <input name="title" placeholder="عنوان پروژه" required />
            <input name="location" placeholder="موقعیت" />
            <input name="image" placeholder="آدرس تصویر مثل /projects/..." />
            <textarea name="description" placeholder="توضیح" required />
            <button type="submit" disabled={busy}>
              افزودن نمونه‌کار
            </button>
          </form>
          {projects.map((project) => (
            <div key={project.id} className="admin-product-row">
              <span />
              <div className="admin-product-meta">
                <strong>{project.title}</strong>
                <span>{project.location}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" className="danger" onClick={() => void jsonFetch(`/api/admin/projects/${project.id}`, { method: "DELETE" })}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <h2>سفارش‌های فروشگاه</h2>
          {message && <p>{message}</p>}
          {orders.length === 0 && <p>سفارشی ثبت نشده است.</p>}
          {orders.map((order) => (
            <div key={order.id} className="admin-product-row">
              <span />
              <div className="admin-product-meta">
                <strong>
                  {order.name} · {order.total.toLocaleString("fa-IR")} تومان
                </strong>
                <span>{order.phone}</span>
              </div>
              <select
                value={order.status}
                onChange={(event) =>
                  void jsonFetch("/api/admin/orders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: order.id, status: event.target.value }),
                  })
                }
              >
                <option value="new">جدید</option>
                <option value="confirmed">تأیید</option>
                <option value="done">انجام‌شده</option>
                <option value="cancelled">لغو</option>
              </select>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="admin-split">
      <section className="admin-panel">
        <h2>آپدیت از سایت مادر</h2>
        <p>کاتالوگ از Saveria گرفته می‌شود، تصویرها هم‌خوان می‌شوند و اگر بک‌اند بالا باشد روی فروشگاه زنده هم منتشر می‌شود.</p>
        {message && <p>{message}</p>}
        <button type="button" disabled={busy} onClick={() => void jsonFetch("/api/admin/sync-saveria", { method: "POST" })}>
          همگام‌سازی الان
        </button>
      </section>
      <section className="admin-panel">
        <h2>آپدیت زنده از فایل کاتالوگ</h2>
        <p>PDF کاتالوگ را بگذارید تا در بازه زمانی مشخص، محصول جدید فقط اضافه شود.</p>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            void jsonFetch("/api/admin/catalog-cron", { method: "POST", body: data });
          }}
        >
          <input type="file" name="file" accept=".pdf,.xlsx" required />
          <div className="admin-form-inline">
            <label>
              فاصله اجرا (دقیقه)
              <input name="intervalMinutes" type="number" defaultValue={30} min={1} />
            </label>
            <label>
              مدت کل (دقیقه)
              <input name="durationMinutes" type="number" defaultValue={240} min={30} />
            </label>
          </div>
          <button type="submit" disabled={busy}>
            شروع آپدیت زنده
          </button>
        </form>
        {Boolean(cron?.running) && (
          <button type="button" className="danger" onClick={() => void jsonFetch("/api/admin/catalog-cron", { method: "DELETE" })}>
            توقف آپدیت زنده
          </button>
        )}
        {cron && (
          <p>
            وضعیت: {cron.running ? "فعال" : "متوقف"}
            {cron.fileName ? ` · فایل ${String(cron.fileName)}` : ""}
            {cron.lastRunAt ? ` · آخرین اجرا ${String(cron.lastRunAt)}` : ""}
            {cron.lastError ? ` · خطا: ${String(cron.lastError)}` : ""}
          </p>
        )}
      </section>
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  busy,
  onSave,
  onDelete,
  onUpload,
}: {
  product: Product;
  categories: string[];
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const [title, setTitle] = useState(product.title);
  const [category, setCategory] = useState(product.category);
  const [specs, setSpecs] = useState(product.specs);
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));
  const [priceLabel, setPriceLabel] = useState(product.priceLabel || "");
  const [protocol, setProtocol] = useState(product.protocol || "");
  const [colors, setColors] = useState((product.colors || []).join("، "));

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          title,
          category,
          specs,
          price: price === "" ? null : Number(price),
          priceLabel,
          protocol,
          colors: colors
            .split(/[،,]/)
            .map((item) => item.trim())
            .filter(Boolean),
        });
      }}
    >
      <label>
        عنوان
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        دسته
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        مشخصات
        <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} rows={4} />
      </label>
      <div className="admin-form-inline">
        <label>
          قیمت
          <input value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          برچسب قیمت
          <input value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} />
        </label>
        <label>
          پروتکل
          <input value={protocol} onChange={(e) => setProtocol(e.target.value)} />
        </label>
      </div>
      <label>
        رنگ‌ها
        <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="سفید، مشکی" />
      </label>
      <label className="file-label">
        تصویر محصول
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onUpload(file);
          }}
        />
      </label>
      <div className="admin-row-actions">
        <button type="submit" disabled={busy}>
          ذخیره محصول
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onDelete}>
          حذف
        </button>
      </div>
    </form>
  );
}

function GuideEditor({
  guide,
  busy,
  onSave,
  onDelete,
}: {
  guide: Guide;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(guide.title);
  const [excerpt, setExcerpt] = useState(guide.excerpt);
  const [category, setCategory] = useState(guide.category);
  const [status, setStatus] = useState(guide.status || "published");
  const [body, setBody] = useState(guide.body.join("\n\n"));

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title, excerpt, category, status, body });
      }}
    >
      <label>
        عنوان
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        خلاصه
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
      </label>
      <div className="admin-form-inline">
        <label>
          دسته
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          وضعیت
          <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="published">منتشرشده</option>
            <option value="draft">پیش‌نویس</option>
          </select>
        </label>
      </div>
      <label>
        متن مقاله
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
      </label>
      <div className="admin-row-actions">
        <button type="submit" disabled={busy}>
          ذخیره مقاله
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onDelete}>
          حذف
        </button>
      </div>
    </form>
  );
}
